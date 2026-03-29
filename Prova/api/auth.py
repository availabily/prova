"""
prova/api/auth.py

API key validation and rate limiting for the Prova API.

Rate limits:
  Free tier (authenticated): 500 requests/month, 10/minute burst
  Team tier:                 10,000 requests/month, 60/minute burst
  Enterprise:                custom (enforced at contract level)
  Demo key (unauthenticated): 10 requests per IP address, lifetime hard cap

All limits are enforced via Supabase usage table counts.
In-memory burst limiting uses a simple sliding window per key/IP.
"""

from __future__ import annotations

import hashlib
import os
import time
from collections import defaultdict, deque
from typing import Any

from fastapi import Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from prova.api.errors import (
    demo_limit_reached,
    rate_limited,
    unauthorized,
)

# ---------------------------------------------------------------------------
# Demo key config
# ---------------------------------------------------------------------------

# The demo key is public and hardcoded — rate limited by IP, not by key.
# It is safe to embed in documentation and quickstart examples.
DEMO_API_KEY = os.environ.get("DEMO_API_KEY", "prova-demo-key-public")
DEMO_IP_LIMIT = 10       # lifetime requests per IP

# ---------------------------------------------------------------------------
# Rate limit config per plan
# ---------------------------------------------------------------------------

PLAN_LIMITS: dict[str, dict[str, int]] = {
    "free": {
        "monthly": 500,
        "burst_per_minute": 10,
    },
    "team": {
        "monthly": 10_000,
        "burst_per_minute": 60,
    },
    "enterprise": {
        "monthly": 999_999_999,   # effectively unlimited
        "burst_per_minute": 300,
    },
}

# ---------------------------------------------------------------------------
# In-memory burst rate limiter (sliding window)
# ---------------------------------------------------------------------------

# Maps key_or_ip → deque of request timestamps (float, seconds)
_burst_windows: dict[str, deque] = defaultdict(deque)


def _check_burst_limit(key: str, limit_per_minute: int) -> bool:
    """Sliding window burst limiter.

    Args:
        key:              API key hash or IP string.
        limit_per_minute: Max requests in any 60-second window.

    Returns:
        True if the request is allowed, False if rate limited.
    """
    now = time.monotonic()
    window = _burst_windows[key]

    # Remove timestamps older than 60 seconds
    while window and now - window[0] > 60:
        window.popleft()

    if len(window) >= limit_per_minute:
        return False

    window.append(now)
    return True


# ---------------------------------------------------------------------------
# Key hashing
# ---------------------------------------------------------------------------

def _hash_key(raw_key: str) -> str:
    """SHA-256 hash of an API key for safe DB comparison.

    Raw keys are never stored in the database.
    """
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Auth resolution
# ---------------------------------------------------------------------------

security = HTTPBearer(auto_error=False)


async def resolve_auth(
    request: Request,
    supabase_client: Any,
) -> dict[str, Any]:
    """Resolve authentication and enforce rate limits.

    Checks the Authorization header for a Bearer token.
    Falls back to demo key handling if no token is provided.

    Args:
        request:         FastAPI Request object (for IP extraction).
        supabase_client: Initialised Supabase client for DB lookups.

    Returns:
        An auth context dict:
        {
            "authenticated": bool,
            "user_id": str | None,
            "api_key_id": str | None,
            "plan": str,           # free | team | enterprise
            "is_demo": bool,
        }

    Raises:
        HTTPException: On invalid key, exhausted demo limit, or rate limit.
    """
    # Extract bearer token
    auth_header = request.headers.get("Authorization", "")
    raw_key: str | None = None

    if auth_header.startswith("Bearer "):
        raw_key = auth_header.removeprefix("Bearer ").strip()

    # Demo key path
    if raw_key is None or raw_key == DEMO_API_KEY:
        client_ip = _get_client_ip(request)
        return await _handle_demo(client_ip, supabase_client)

    # Authenticated key path
    return await _handle_authenticated(raw_key, request, supabase_client)


async def _handle_demo(
    client_ip: str,
    supabase_client: Any,
) -> dict[str, Any]:
    """Handle demo (unauthenticated) request.

    Enforces 10 lifetime requests per IP address.
    """
    key = f"demo:{client_ip}"

    # Count lifetime demo usage for this IP from Supabase
    result = (
        supabase_client.table("usage")
        .select("id", count="exact")
        .is_("api_key_id", None)
        .eq("metadata->>client_ip", client_ip)
        .execute()
    )
    count = result.count or 0

    if count >= DEMO_IP_LIMIT:
        raise demo_limit_reached()

    # Burst check for demo (generous — 5/minute)
    if not _check_burst_limit(key, 5):
        raise rate_limited("demo")

    return {
        "authenticated": False,
        "user_id": None,
        "api_key_id": None,
        "plan": "free",
        "is_demo": True,
        "client_ip": client_ip,
    }


async def _handle_authenticated(
    raw_key: str,
    request: Request,
    supabase_client: Any,
) -> dict[str, Any]:
    """Validate an authenticated API key and enforce rate limits."""
    key_hash = _hash_key(raw_key)

    # Look up key in DB
    result = (
        supabase_client.table("api_keys")
        .select("id, user_id, is_active")
        .eq("key_hash", key_hash)
        .single()
        .execute()
    )

    if not result.data:
        raise unauthorized()

    key_record = result.data
    if not key_record.get("is_active", False):
        raise unauthorized()

    api_key_id: str = key_record["id"]
    user_id: str = key_record["user_id"]

    # Get user plan
    user_result = (
        supabase_client.table("users")
        .select("plan")
        .eq("id", user_id)
        .single()
        .execute()
    )
    plan = user_result.data.get("plan", "free") if user_result.data else "free"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

    # Monthly usage check
    if plan != "enterprise":
        from datetime import UTC, datetime
        now = datetime.now(UTC)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

        usage_result = (
            supabase_client.table("usage")
            .select("id", count="exact")
            .eq("api_key_id", api_key_id)
            .gte("created_at", month_start)
            .execute()
        )
        monthly_count = usage_result.count or 0

        if monthly_count >= limits["monthly"]:
            raise rate_limited(plan)

    # Burst check
    if not _check_burst_limit(api_key_id, limits["burst_per_minute"]):
        raise rate_limited(plan)

    # Update last_used_at (fire and forget — don't block on this)
    try:
        from datetime import UTC, datetime
        supabase_client.table("api_keys").update(
            {"last_used_at": datetime.now(UTC).isoformat()}
        ).eq("id", api_key_id).execute()
    except Exception:
        pass  # Non-critical — don't fail the request

    return {
        "authenticated": True,
        "user_id": user_id,
        "api_key_id": api_key_id,
        "plan": plan,
        "is_demo": False,
        "client_ip": _get_client_ip(request),
    }


def _get_client_ip(request: Request) -> str:
    """Extract the real client IP, respecting Railway/Vercel proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
