"""
prova/api/main.py

FastAPI application for the Prova reasoning validity engine.

Endpoints:
  POST /verify              — analyze a reasoning chain, return certificate
  GET  /certificate/{id}    — retrieve a stored certificate by ID
  GET  /health              — health check with version info

All endpoints are served at api.prova.cobound.dev via Railway.
"""

from __future__ import annotations

import os
import traceback
from typing import Any

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import Client, create_client

from prova.analysis.analyzer import analyze
from prova.analysis.graph_builder import build_network, network_to_graph_json
from prova.api.auth import resolve_auth
from prova.api.errors import (
    analysis_failed,
    certificate_not_found,
    extraction_ambiguous,
    extraction_failed,
    internal_error,
    no_structure_detected,
)
from prova.api.models import CertificateResponse, ErrorResponse, HealthResponse, VerifyRequest
from prova.certificate.generator import generate_certificate
from prova.certificate.versioning import PROVA_VERSION, get_validator_version
from prova.extraction.extractor import ExtractionError, extract_argument_graph
from prova.extraction.validator import validate_extraction
from prova.storage.client import store_certificate, get_certificate, log_usage

# ---------------------------------------------------------------------------
# Sentry (error monitoring) — initialised before app creation
# ---------------------------------------------------------------------------

sentry_dsn = os.environ.get("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=os.environ.get("RAILWAY_ENVIRONMENT", "production"),
        traces_sample_rate=0.1,
    )

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Prova",
    description=(
        "The first formally verified reasoning engine for AI. "
        "Prova analyzes AI reasoning chains and produces certificates "
        "of logical validity — or precise diagnoses of where reasoning breaks down."
    ),
    version=PROVA_VERSION,
    docs_url="/docs",
    redoc_url=None,
)

# ---------------------------------------------------------------------------
# CORS — allow prova.cobound.dev and prova.dev frontends
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://prova.cobound.dev",
        "https://prova.dev",
        "https://www.prova.dev",
        "http://localhost:3000",   # local development
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

# ---------------------------------------------------------------------------
# Supabase client (module-level — reused across requests)
# ---------------------------------------------------------------------------

def _get_supabase() -> Client:
    """Create and return a Supabase client using service role key."""
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Health check. Returns current Prova and validator versions."""
    return HealthResponse(
        status="ok",
        version=PROVA_VERSION,
        validator_version=get_validator_version(),
    )


# ---------------------------------------------------------------------------
# Verify endpoint
# ---------------------------------------------------------------------------

@app.post(
    "/verify",
    response_model=CertificateResponse,
    responses={
        422: {"model": ErrorResponse, "description": "Input or extraction error"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
        500: {"model": ErrorResponse, "description": "Internal analysis error"},
    },
    tags=["verification"],
)
async def verify(request: Request, body: VerifyRequest) -> CertificateResponse:
    """Analyze a reasoning chain and return a formal validity certificate.

    Accepts any AI chain-of-thought reasoning output and returns either:
    - A VALID certificate confirming logical structural soundness, or
    - An INVALID certificate with precise failure diagnosis.

    This certificate verifies logical structure only. It does not verify
    factual accuracy, ethical appropriateness, or fitness for purpose.
    """
    supabase = _get_supabase()

    # ── Auth + rate limiting ───────────────────────────────────────────
    auth_ctx = await resolve_auth(request, supabase)

    # ── Step 1: Extract argument graph ────────────────────────────────
    try:
        extraction = extract_argument_graph(
            reasoning=body.reasoning,
            format_hint=body.format,
        )
    except ValueError as exc:
        # Input validation failures (too short, etc.)
        raise no_structure_detected() from exc
    except ExtractionError as exc:
        raise extraction_failed(str(exc)) from exc
    except Exception as exc:
        if sentry_dsn:
            sentry_sdk.capture_exception(exc)
        raise internal_error(str(exc)) from exc

    # ── Step 2: Confidence gate ───────────────────────────────────────
    passes, score, reason = validate_extraction(extraction)

    if not passes:
        if not extraction.get("extractable", True):
            raise no_structure_detected()
        raise extraction_ambiguous(score)

    # ── Step 3: Build AgentNetwork ────────────────────────────────────
    try:
        network, graph_metadata = build_network(extraction)
    except ValueError as exc:
        raise extraction_failed(str(exc)) from exc

    # ── Step 4: Run cobound-validator analysis ────────────────────────
    try:
        result = analyze(
            network=network,
            metadata=graph_metadata,
            domain=body.metadata.get("domain") if body.metadata else None,
        )
    except Exception as exc:
        if sentry_dsn:
            sentry_sdk.capture_exception(exc)
        raise analysis_failed(str(exc)) from exc

    # ── Step 5: Build argument graph JSON for certificate ─────────────
    argument_graph = network_to_graph_json(network, graph_metadata)

    # ── Step 6: Generate certificate ─────────────────────────────────
    certificate = generate_certificate(
        reasoning=body.reasoning,
        extraction=extraction,
        confidence_score=score,
        argument_graph=argument_graph,
        analysis_result=result,
        retain=body.retain,
        metadata=body.metadata,
    )

    # ── Step 7: Store certificate in Supabase ─────────────────────────
    try:
        await store_certificate(
            supabase=supabase,
            certificate=certificate,
            user_id=auth_ctx.get("user_id"),
            api_key_id=auth_ctx.get("api_key_id"),
        )
    except Exception as exc:
        # Storage failure should not prevent returning the certificate —
        # log it but return the result anyway.
        if sentry_dsn:
            sentry_sdk.capture_exception(exc)

    # ── Step 8: Log usage ─────────────────────────────────────────────
    try:
        await log_usage(
            supabase=supabase,
            api_key_id=auth_ctx.get("api_key_id"),
            user_id=auth_ctx.get("user_id"),
            verdict=certificate["verdict"],
            failure_type=result.failure_type,
            reasoning_length=len(body.reasoning),
            format_hint=body.format,
            retain=body.retain,
            client_ip=auth_ctx.get("client_ip"),
        )
    except Exception:
        pass  # Usage logging is non-critical

    return CertificateResponse(**certificate)


# ---------------------------------------------------------------------------
# Get certificate endpoint
# ---------------------------------------------------------------------------

@app.get(
    "/certificate/{certificate_id}",
    response_model=CertificateResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Certificate not found"},
    },
    tags=["certificates"],
)
async def get_certificate_by_id(
    certificate_id: str,
    request: Request,
) -> CertificateResponse:
    """Retrieve a stored certificate by its ID.

    Certificates are permanent and publicly accessible by ID.
    Anyone with the certificate ID can retrieve and verify it.
    """
    supabase = _get_supabase()

    cert = await get_certificate(supabase=supabase, certificate_id=certificate_id)
    if not cert:
        raise certificate_not_found(certificate_id)

    return CertificateResponse(**cert)


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if sentry_dsn:
        sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred.",
        },
    )
