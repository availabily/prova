"""
prova/api/models.py

Pydantic request and response models for the Prova API.

These models define the exact wire format for all API endpoints.
They match the certificate schema in the Prova Design Specification v1.0.0.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class VerifyRequest(BaseModel):
    """POST /verify request body."""

    reasoning: str = Field(
        ...,
        description="The AI reasoning chain to verify. Plain text.",
        min_length=20,
        max_length=32000,
    )
    format: str = Field(
        default="auto",
        description=(
            "Hint about reasoning structure. "
            "'structured' for numbered steps, "
            "'prose' for flowing text, "
            "'auto' to detect automatically."
        ),
        pattern="^(auto|structured|prose)$",
    )
    retain: bool = Field(
        default=True,
        description=(
            "If false, the original reasoning text is not stored. "
            "Certificate metadata is always stored."
        ),
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Optional caller-provided key-value pairs attached to the "
            "certificate. Useful for pipeline names, decision IDs, model names."
        ),
    )


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class GraphNode(BaseModel):
    """A node in the argument graph."""
    id: str
    text: str
    type: str  # premise | claim | conclusion


class GraphEdge(BaseModel):
    """A directed edge in the argument graph."""
    from_: str = Field(..., alias="from")
    to: str

    model_config = {"populate_by_name": True}


class ArgumentGraph(BaseModel):
    """The argument dependency graph included in every certificate."""
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class KnownConsequence(BaseModel):
    """A known downstream failure consequence from the registry."""
    id: str
    domain: str
    name: str
    consequence: str
    severity: str


class FailureDetail(BaseModel):
    """Failure diagnosis — present only on INVALID certificates."""
    type: str                              # CIRCULAR | CONTRADICTION | UNSUPPORTED_LEAP
    failure_id: str | None = None
    location: str
    description: str
    affected_nodes: list[str]
    affected_edges: list[dict[str, str]]
    known_consequence: KnownConsequence | None = None


class CertificateResponse(BaseModel):
    """Full certificate response — returned by POST /verify and GET /certificate/{id}."""

    certificate_id: str
    timestamp: str
    verdict: str                           # VALID | INVALID
    confidence_score: int = Field(..., ge=0, le=100)
    prova_version: str
    validator_version: str
    extraction_prompt_version: str
    argument_graph: dict[str, Any]         # Raw dict — frontend handles rendering
    failure: FailureDetail | None = None
    original_reasoning: str | None = None  # None if retain=false
    metadata: dict[str, Any] = Field(default_factory=dict)
    certificate_url: str
    sha256: str


class HealthResponse(BaseModel):
    """GET /health response."""
    status: str
    version: str
    validator_version: str


# ---------------------------------------------------------------------------
# Error response models
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    """Standard error response shape for all API errors."""
    error: str      # machine-readable error code
    message: str    # human-readable description
    confidence_score: int | None = None   # present on EXTRACTION_AMBIGUOUS
