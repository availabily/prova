"""
prova/storage/client.py

Supabase storage integration for certificates and usage logging.

All database writes use the service role key (bypasses RLS).
Certificate reads are public — no auth required to retrieve by ID.
"""

from __future__ import annotations

from typing import Any

from supabase import Client


# ---------------------------------------------------------------------------
# Certificate storage
# ---------------------------------------------------------------------------

async def store_certificate(
    supabase: Client,
    certificate: dict[str, Any],
    user_id: str | None,
    api_key_id: str | None,
) -> None:
    """Store a certificate in the Supabase certificates table.

    Args:
        supabase:     Supabase client (service role).
        certificate:  The complete certificate dict from generator.py.
        user_id:      Authenticated user ID, or None for demo/unauthenticated.
        api_key_id:   API key ID used for this request, or None for demo.
    """
    row = {
        "id":                       certificate["certificate_id"],
        "created_at":               certificate["timestamp"],
        "verdict":                  certificate["verdict"],
        "confidence_score":         certificate["confidence_score"],
        "prova_version":            certificate["prova_version"],
        "validator_version":        certificate["validator_version"],
        "extraction_prompt_version": certificate.get("extraction_prompt_version", "v1"),
        "argument_graph":           certificate["argument_graph"],
        "failure":                  certificate.get("failure"),
        "original_reasoning":       certificate.get("original_reasoning"),  # None if retain=false
        "metadata":                 certificate.get("metadata", {}),
        "sha256":                   certificate["sha256"],
        "user_id":                  user_id,
        "api_key_id":               api_key_id,
    }

    supabase.table("certificates").insert(row).execute()


async def get_certificate(
    supabase: Client,
    certificate_id: str,
) -> dict[str, Any] | None:
    """Retrieve a certificate by ID.

    Args:
        supabase:        Supabase client.
        certificate_id:  The PRV-YYYY-XXXX certificate ID.

    Returns:
        The certificate dict, or None if not found.
    """
    result = (
        supabase.table("certificates")
        .select("*")
        .eq("id", certificate_id)
        .single()
        .execute()
    )

    if not result.data:
        return None

    row = result.data

    # Remap DB column names to certificate response field names
    return {
        "certificate_id":             row["id"],
        "timestamp":                  row["created_at"],
        "verdict":                    row["verdict"],
        "confidence_score":           row["confidence_score"],
        "prova_version":              row["prova_version"],
        "validator_version":          row["validator_version"],
        "extraction_prompt_version":  row.get("extraction_prompt_version", "v1"),
        "argument_graph":             row["argument_graph"],
        "failure":                    row.get("failure"),
        "original_reasoning":         row.get("original_reasoning"),
        "metadata":                   row.get("metadata", {}),
        "certificate_url": (
            f"https://prova.cobound.dev/certificate/{row['id']}"
        ),
        "sha256":                     row["sha256"],
    }


# ---------------------------------------------------------------------------
# Usage logging
# ---------------------------------------------------------------------------

async def log_usage(
    supabase: Client,
    api_key_id: str | None,
    user_id: str | None,
    verdict: str,
    failure_type: str | None,
    reasoning_length: int,
    format_hint: str,
    retain: bool,
    client_ip: str | None = None,
) -> None:
    """Log a verification request to the usage table.

    Stores metadata only — never stores reasoning content.

    Args:
        supabase:          Supabase client (service role).
        api_key_id:        API key ID or None for demo.
        user_id:           User ID or None for demo.
        verdict:           "VALID" or "INVALID".
        failure_type:      "CIRCULAR", "CONTRADICTION", "UNSUPPORTED_LEAP", or None.
        reasoning_length:  Character count of the reasoning chain.
        format_hint:       Format hint from the request.
        retain:            Whether reasoning was retained.
        client_ip:         Client IP (for demo rate limiting).
    """
    row: dict[str, Any] = {
        "api_key_id":               api_key_id,
        "user_id":                  user_id,
        "verdict":                  verdict,
        "failure_type":             failure_type,
        "reasoning_length_chars":   reasoning_length,
        "format":                   format_hint,
        "retain":                   retain,
    }

    # Store client IP in metadata for demo rate limiting (not a separate column)
    if client_ip:
        row["metadata"] = {"client_ip": client_ip}

    supabase.table("usage").insert(row).execute()
