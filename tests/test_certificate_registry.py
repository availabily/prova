"""
tests/test_certificate.py
tests/test_registry.py

Certificate generation and reasoning failures registry tests.
"""

from __future__ import annotations

import pytest

from prova.certificate.generator import generate_certificate, verify_certificate_hash
from prova.certificate.versioning import PROVA_VERSION, get_versions
from prova.reasoning_failures.registry import (
    all_failure_types,
    get_most_severe,
    map_failure,
)


# ============================================================
# CERTIFICATE TESTS
# ============================================================

# Minimal mock AnalysisResult for testing
class _MockResult:
    def __init__(self, feasible=True, failure_type=None, failure_detail=None, cycles=None):
        self.feasible = feasible
        self.failure_type = failure_type
        self.failure_detail = failure_detail
        self.cycles = cycles or []
        self.suggested_fixes = []
        self.raw_validator_output = {}

    @property
    def verdict(self):
        return "VALID" if self.feasible else "INVALID"


SAMPLE_GRAPH = {
    "nodes": [
        {"id": "claim-1", "text": "Premise", "type": "premise"},
        {"id": "claim-2", "text": "Conclusion", "type": "conclusion"},
    ],
    "edges": [{"from": "claim-1", "to": "claim-2"}],
}

SAMPLE_EXTRACTION = {"prompt_version": "v1"}


class TestGenerateCertificate:
    def test_generates_valid_certificate(self):
        result = _MockResult(feasible=True)
        cert = generate_certificate(
            reasoning="Since X is true, Y follows.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=95,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
        )
        assert cert["verdict"] == "VALID"
        assert cert["confidence_score"] == 95
        assert cert["failure"] is None

    def test_generates_invalid_certificate(self):
        failure = {
            "type": "CIRCULAR",
            "location": "Step 3",
            "description": "Circular reasoning detected.",
            "affected_nodes": ["claim-1"],
            "affected_edges": [],
            "known_consequence": None,
        }
        result = _MockResult(feasible=False, failure_type="CIRCULAR", failure_detail=failure)
        cert = generate_certificate(
            reasoning="X because Y because X.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=85,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
        )
        assert cert["verdict"] == "INVALID"
        assert cert["failure"] is not None
        assert cert["failure"]["type"] == "CIRCULAR"

    def test_certificate_id_format(self):
        result = _MockResult(feasible=True)
        cert = generate_certificate(
            reasoning="Since X therefore Y therefore Z.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=90,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
        )
        cid = cert["certificate_id"]
        assert cid.startswith("PROVA-")
        parts = cid.split("-")
        assert len(parts) == 3
        assert len(parts[1]) == 8  # YYYYMMDD
        assert len(parts[2]) == 4  # hash suffix

    def test_sha256_present_and_correct_length(self):
        result = _MockResult(feasible=True)
        cert = generate_certificate(
            reasoning="Since X therefore Y.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=88,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
        )
        assert "sha256" in cert
        assert len(cert["sha256"]) == 64  # SHA-256 hex is 64 chars

    def test_retain_false_removes_reasoning(self):
        result = _MockResult(feasible=True)
        cert = generate_certificate(
            reasoning="Private reasoning chain.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=90,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
            retain=False,
        )
        assert cert["original_reasoning"] is None

    def test_retain_true_stores_reasoning(self):
        result = _MockResult(feasible=True)
        cert = generate_certificate(
            reasoning="Public reasoning chain.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=90,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
            retain=True,
        )
        assert cert["original_reasoning"] == "Public reasoning chain."

    def test_dual_versioning_present(self):
        result = _MockResult(feasible=True)
        cert = generate_certificate(
            reasoning="Since X therefore Y.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=90,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
        )
        assert "prova_version" in cert
        assert "validator_version" in cert
        assert cert["prova_version"] == PROVA_VERSION

    def test_metadata_attached(self):
        result = _MockResult(feasible=True)
        cert = generate_certificate(
            reasoning="Since X therefore Y.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=90,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
            metadata={"pipeline": "test-pipeline", "model": "claude-sonnet-4-6"},
        )
        assert cert["metadata"]["pipeline"] == "test-pipeline"


class TestVerifyCertificateHash:
    def test_valid_certificate_verifies(self):
        result = _MockResult(feasible=True)
        cert = generate_certificate(
            reasoning="Since X therefore Y.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=90,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
        )
        assert verify_certificate_hash(cert) is True

    def test_tampered_verdict_fails_verification(self):
        result = _MockResult(feasible=True)
        cert = generate_certificate(
            reasoning="Since X therefore Y.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=90,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
        )
        cert["verdict"] = "INVALID"  # tamper
        assert verify_certificate_hash(cert) is False

    def test_tampered_score_fails_verification(self):
        result = _MockResult(feasible=True)
        cert = generate_certificate(
            reasoning="Since X therefore Y.",
            extraction=SAMPLE_EXTRACTION,
            confidence_score=90,
            argument_graph=SAMPLE_GRAPH,
            analysis_result=result,
        )
        cert["confidence_score"] = 42  # tamper
        assert verify_certificate_hash(cert) is False


# ============================================================
# REGISTRY TESTS
# ============================================================

class TestMapFailure:
    def test_circular_returns_entries(self):
        results = map_failure("CIRCULAR")
        assert len(results) > 0

    def test_contradiction_returns_entries(self):
        results = map_failure("CONTRADICTION")
        assert len(results) > 0

    def test_unsupported_leap_returns_entries(self):
        results = map_failure("UNSUPPORTED_LEAP")
        assert len(results) > 0

    def test_unknown_type_returns_empty(self):
        results = map_failure("NONEXISTENT_TYPE")
        assert results == []

    def test_domain_filter_works(self):
        results = map_failure("CIRCULAR", domain="medical")
        for r in results:
            assert r["domain"] in ("medical", "general")

    def test_all_entries_have_required_keys(self):
        for ftype in all_failure_types():
            for entry in map_failure(ftype):
                assert "id" in entry
                assert "domain" in entry
                assert "name" in entry
                assert "consequence" in entry
                assert "severity" in entry

    def test_severity_values_are_valid(self):
        valid = {"critical", "high", "medium", "low"}
        for ftype in all_failure_types():
            for entry in map_failure(ftype):
                assert entry["severity"] in valid


class TestGetMostSevere:
    def test_returns_critical_when_available(self):
        result = get_most_severe("CIRCULAR")
        assert result is not None
        assert result["severity"] == "critical"

    def test_returns_none_for_unknown_type(self):
        assert get_most_severe("UNKNOWN") is None

    def test_domain_filter_respected(self):
        result = get_most_severe("CIRCULAR", domain="medical")
        assert result is not None
        assert result["domain"] in ("medical", "general")


class TestAllFailureTypes:
    def test_returns_three_types(self):
        types = all_failure_types()
        assert "CIRCULAR" in types
        assert "CONTRADICTION" in types
        assert "UNSUPPORTED_LEAP" in types
