"""
prova/api/errors.py

All error types, codes, and HTTP status mappings for the Prova API.

Every error the API can return is defined here with a machine-readable code,
a human-readable message, and an HTTP status code.
"""

from __future__ import annotations

from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Error code constants
# ---------------------------------------------------------------------------

INPUT_TOO_SHORT       = "INPUT_TOO_SHORT"
INPUT_TOO_LONG        = "INPUT_TOO_LONG"
NO_STRUCTURE_DETECTED = "NO_STRUCTURE_DETECTED"
EXTRACTION_AMBIGUOUS  = "EXTRACTION_AMBIGUOUS"
EXTRACTION_FAILED     = "EXTRACTION_FAILED"
ANALYSIS_FAILED       = "ANALYSIS_FAILED"
CERTIFICATE_NOT_FOUND = "CERTIFICATE_NOT_FOUND"
UNAUTHORIZED          = "UNAUTHORIZED"
RATE_LIMITED          = "RATE_LIMITED"
DEMO_LIMIT_REACHED    = "DEMO_LIMIT_REACHED"
INTERNAL_ERROR        = "INTERNAL_ERROR"


# ---------------------------------------------------------------------------
# Error factories
# ---------------------------------------------------------------------------

def input_too_short() -> HTTPException:
    return HTTPException(
        status_code=422,
        detail={
            "error": INPUT_TOO_SHORT,
            "message": (
                "Reasoning chain must contain at least 20 characters. "
                "Submit a complete reasoning chain with at least two distinct claims."
            ),
        },
    )


def input_too_long(max_chars: int = 32000) -> HTTPException:
    return HTTPException(
        status_code=422,
        detail={
            "error": INPUT_TOO_LONG,
            "message": (
                f"Reasoning chain exceeds the {max_chars:,}-character limit. "
                "For longer chains, consider submitting individual sections for analysis."
            ),
        },
    )


def no_structure_detected() -> HTTPException:
    return HTTPException(
        status_code=422,
        detail={
            "error": NO_STRUCTURE_DETECTED,
            "message": (
                "Prova could not identify a logical dependency structure in this input. "
                "This may indicate the input is descriptive rather than argumentative. "
                "For best results, submit reasoning chains that include explicit "
                "claims, premises, and conclusions."
            ),
        },
    )


def extraction_ambiguous(score: int) -> HTTPException:
    return HTTPException(
        status_code=422,
        detail={
            "error": EXTRACTION_AMBIGUOUS,
            "message": (
                "Multiple valid dependency structures were detected with low confidence "
                f"(score: {score}/100). The reasoning structure is ambiguous. "
                "Consider submitting a more explicitly structured reasoning chain, "
                "or break it into smaller sections."
            ),
            "confidence_score": score,
        },
    )


def extraction_failed(detail: str = "") -> HTTPException:
    msg = "Prova failed to extract the logical structure from the reasoning chain."
    if detail:
        msg += f" Detail: {detail}"
    return HTTPException(
        status_code=500,
        detail={"error": EXTRACTION_FAILED, "message": msg},
    )


def analysis_failed(detail: str = "") -> HTTPException:
    msg = "Prova failed to analyze the extracted argument graph."
    if detail:
        msg += f" Detail: {detail}"
    return HTTPException(
        status_code=500,
        detail={"error": ANALYSIS_FAILED, "message": msg},
    )


def certificate_not_found(certificate_id: str) -> HTTPException:
    return HTTPException(
        status_code=404,
        detail={
            "error": CERTIFICATE_NOT_FOUND,
            "message": f"No certificate found with ID '{certificate_id}'.",
        },
    )


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={
            "error": UNAUTHORIZED,
            "message": (
                "Invalid or missing API key. "
                "Include your key as 'Authorization: Bearer <key>' "
                "or obtain a free key at https://prova.cobound.dev."
            ),
        },
    )


def rate_limited(plan: str = "free") -> HTTPException:
    return HTTPException(
        status_code=429,
        detail={
            "error": RATE_LIMITED,
            "message": (
                f"Rate limit reached for {plan} tier. "
                "Upgrade your plan at https://prova.cobound.dev/pricing."
            ),
        },
    )


def demo_limit_reached() -> HTTPException:
    return HTTPException(
        status_code=429,
        detail={
            "error": DEMO_LIMIT_REACHED,
            "message": (
                "The demo API key has reached its limit for your IP address (10 requests). "
                "Create a free account at https://prova.cobound.dev to get 500 "
                "verifications per month at no cost."
            ),
        },
    )


def internal_error(detail: str = "") -> HTTPException:
    msg = "An unexpected error occurred. Please try again or contact support."
    if detail:
        msg += f" Detail: {detail}"
    return HTTPException(
        status_code=500,
        detail={"error": INTERNAL_ERROR, "message": msg},
    )
