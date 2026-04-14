"""
prova/certificate/generator.py

Generates Prova reasoning validity certificates.

A certificate is a permanent, tamper-evident record that a specific reasoning
chain was analyzed at a specific time and found to be structurally valid or
invalid. The SHA-256 hash allows independent verification.
"""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import string
from datetime import UTC, datetime
from typing import Any

from prova.certificate.versioning import get_versions


# ---------------------------------------------------------------------------
# Certificate ID generation
# ---------------------------------------------------------------------------

def _generate_certificate_id(sha256: str, issued_at: datetime) -> str:
    """Generate a human-readable certificate ID.

    Format: PROVA-YYYYMMDD-XXXX
    Where XXXX is the first 4 uppercase hex characters of the SHA-256 hash.

    Examples: PROVA-20260414-A7X4, PROVA-20260414-B2M9

    Args:
        sha256: The certificate's SHA-256 hash (hex string).
        issued_at: UTC issuance timestamp.

    Returns:
        Certificate ID string.
    """
    suffix = sha256[:4].upper()
    date_part = issued_at.strftime("%Y%m%d")
    return f"PROVA-{date_part}-{suffix}"


# ---------------------------------------------------------------------------
# SHA-256 hash
# ---------------------------------------------------------------------------

def _compute_hash(
    certificate_id_placeholder: str,
    timestamp: str,
    verdict: str,
    confidence_score: int,
    argument_graph: dict,
    failure: dict | None,
) -> str:
    """Compute a SHA-256 hash over the certificate's core fields.

    Hash input: deterministic JSON of the core fields.
    Does NOT include: original_reasoning (may be absent), metadata (mutable),
    or certificate_id itself (derived from hash — bootstrapped below).

    The hash allows independent verification that the analytical result
    has not been tampered with since issuance.

    Args:
        certificate_id_placeholder: A stable nonce used before the real ID
                                    is derived. In practice this is the raw
                                    hash hex itself (bootstrapped).
        timestamp:        ISO 8601 timestamp string.
        verdict:          "VALID" or "INVALID".
        confidence_score: 0-100 integer.
        argument_graph:   The graph dict (nodes + edges).
        failure:          Failure detail dict or None.

    Returns:
        Lowercase hex SHA-256 string (64 characters).
    """
    payload = {
        "timestamp": timestamp,
        "verdict": verdict,
        "confidence_score": confidence_score,
        "argument_graph": argument_graph,
        "failure": failure,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_certificate(
    reasoning: str,
    extraction: dict[str, Any],
    confidence_score: int,
    argument_graph: dict[str, Any],
    analysis_result: Any,          # AnalysisResult from analyzer.py
    retain: bool = True,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate a complete Prova certificate dict.

    This is the canonical certificate as stored in Supabase and returned
    in API responses. All downstream representations (PDF, web page, JSON
    response) are derived from this dict.

    Args:
        reasoning:        Original reasoning text submitted by the caller.
        extraction:       Raw extraction output (for prompt_version tracking).
        confidence_score: Score from extraction validator (0-100).
        argument_graph:   Graph JSON from graph_builder.network_to_graph_json().
        analysis_result:  AnalysisResult from analyzer.analyze().
        retain:           If False, original_reasoning is not stored.
        metadata:         Optional caller-provided metadata dict.

    Returns:
        Complete certificate dict matching the Prova API response schema.
    """
    now = datetime.now(UTC)
    timestamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    verdict = analysis_result.verdict
    failure = analysis_result.failure_detail  # None if VALID
    failure_type = analysis_result.failure_type  # None if VALID

    # Compute hash (bootstrapped — hash doesn't include itself)
    sha256 = _compute_hash(
        certificate_id_placeholder="",
        timestamp=timestamp,
        verdict=verdict,
        confidence_score=confidence_score,
        argument_graph=argument_graph,
        failure=failure,
    )

    certificate_id = _generate_certificate_id(sha256, now)
    versions = get_versions()
    base_url = os.environ.get("PROVA_BASE_URL", "https://prova.cobound.dev")
    verify_url = f"{base_url}/verify/{certificate_id}"

    cert: dict[str, Any] = {
        "certificate_id": certificate_id,
        "timestamp": timestamp,
        "issued_at": timestamp,
        "verdict": verdict,
        "failure_type": failure_type,
        "confidence_score": confidence_score,
        "prova_version": versions["prova"],
        "validator_version": versions["validator"],
        "extraction_prompt_version": extraction.get("prompt_version", "v1"),
        "argument_graph": argument_graph,
        "failure": failure,
        "original_reasoning": reasoning if retain else None,
        "metadata": metadata or {},
        "certificate_url": f"{base_url}/certificate/{certificate_id}",
        "verification_url": verify_url,
        "sha256": sha256,
    }

    return cert


# ---------------------------------------------------------------------------
# Certificate validation (for dispute / independent verification)
# ---------------------------------------------------------------------------

def verify_certificate_hash(certificate: dict[str, Any]) -> bool:
    """Verify that a certificate's SHA-256 hash matches its contents.

    Used for independent verification and dispute resolution.

    Args:
        certificate: A certificate dict (as stored or returned by the API).

    Returns:
        True if the hash is valid, False if the certificate has been tampered with.
    """
    expected = _compute_hash(
        certificate_id_placeholder="",
        timestamp=certificate["timestamp"],
        verdict=certificate["verdict"],
        confidence_score=certificate["confidence_score"],
        argument_graph=certificate["argument_graph"],
        failure=certificate.get("failure"),
    )
    return certificate.get("sha256") == expected
