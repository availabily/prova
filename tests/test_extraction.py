"""
tests/test_extraction.py

Tests for the extraction layer.
Mocks the Anthropic API — no real API calls during tests.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from prova.extraction.extractor import ExtractionError, extract_argument_graph
from prova.extraction.validator import (
    CONFIDENCE_THRESHOLD,
    score_extraction,
    validate_extraction,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

VALID_EXTRACTION = {
    "extractable": True,
    "ambiguous": False,
    "nodes": [
        {"id": "claim-1", "text": "The applicant has stable income", "type": "premise"},
        {"id": "claim-2", "text": "They can make payments", "type": "claim"},
        {"id": "claim-3", "text": "The loan should be approved", "type": "conclusion"},
    ],
    "edges": [
        {"from": "claim-1", "to": "claim-2", "connector": "therefore"},
        {"from": "claim-2", "to": "claim-3", "connector": "therefore"},
    ],
    "agents": [
        {"id": "claim-1"},
        {"id": "claim-2"},
        {"id": "claim-3"},
    ],
}

NOT_EXTRACTABLE = {
    "extractable": False,
    "ambiguous": False,
    "nodes": [],
    "edges": [],
    "agents": [],
}

AMBIGUOUS_EXTRACTION = {
    "extractable": True,
    "ambiguous": True,
    "nodes": [
        {"id": "claim-1", "text": "X", "type": "premise"},
        {"id": "claim-2", "text": "Y", "type": "conclusion"},
    ],
    "edges": [
        {"from": "claim-1", "to": "claim-2", "connector": "therefore"},
    ],
    "agents": [
        {"id": "claim-1"},
        {"id": "claim-2"},
    ],
}


# ---------------------------------------------------------------------------
# Validator tests
# ---------------------------------------------------------------------------

class TestScoreExtraction:
    def test_perfect_extraction_scores_100(self):
        score = score_extraction(VALID_EXTRACTION)
        assert score == 100

    def test_not_extractable_scores_zero(self):
        assert score_extraction(NOT_EXTRACTABLE) == 0

    def test_ambiguous_deducts_30(self):
        score = score_extraction(AMBIGUOUS_EXTRACTION)
        assert score == 70  # 100 - 30 for ambiguous

    def test_no_premise_deducts_10(self):
        ext = {**VALID_EXTRACTION, "nodes": [
            {"id": "claim-1", "text": "X", "type": "claim"},
            {"id": "claim-2", "text": "Y", "type": "conclusion"},
        ]}
        score = score_extraction(ext)
        assert score == 90  # 100 - 10

    def test_no_conclusion_deducts_10(self):
        ext = {**VALID_EXTRACTION, "nodes": [
            {"id": "claim-1", "text": "X", "type": "premise"},
            {"id": "claim-2", "text": "Y", "type": "claim"},
        ]}
        score = score_extraction(ext)
        assert score == 90

    def test_dangling_edge_deducts_10(self):
        ext = {
            **VALID_EXTRACTION,
            "edges": [
                {"from": "claim-1", "to": "GHOST-NODE", "connector": "therefore"},
            ],
        }
        score = score_extraction(ext)
        assert score <= 90

    def test_score_never_negative(self):
        bad = {
            "extractable": True,
            "ambiguous": True,
            "nodes": [],
            "edges": [],
            "agents": [],
        }
        assert score_extraction(bad) >= 0


class TestValidateExtraction:
    def test_good_extraction_passes(self):
        passes, score, reason = validate_extraction(VALID_EXTRACTION)
        assert passes is True
        assert score >= CONFIDENCE_THRESHOLD
        assert reason is None

    def test_not_extractable_fails(self):
        passes, score, reason = validate_extraction(NOT_EXTRACTABLE)
        assert passes is False
        assert score == 0
        assert reason is not None

    def test_ambiguous_may_fail(self):
        passes, score, reason = validate_extraction(AMBIGUOUS_EXTRACTION)
        # Score is 70 which equals the threshold — passes
        assert passes is True

    def test_reason_present_on_failure(self):
        passes, score, reason = validate_extraction(NOT_EXTRACTABLE)
        assert isinstance(reason, str)
        assert len(reason) > 10


# ---------------------------------------------------------------------------
# Extractor tests (mocked API)
# ---------------------------------------------------------------------------

class TestExtractArgumentGraph:
    def _mock_response(self, json_str: str) -> MagicMock:
        msg = MagicMock()
        msg.content = [MagicMock(text=json_str)]
        return msg

    def test_valid_extraction_returned(self):
        import json
        with patch("prova.extraction.extractor.anthropic.Anthropic") as mock_anthropic:
            mock_client = MagicMock()
            mock_anthropic.return_value = mock_client
            mock_client.messages.create.return_value = self._mock_response(
                json.dumps({**VALID_EXTRACTION, "prompt_version": "v1"})
            )
            result = extract_argument_graph("The applicant has stable income, so they can pay, so approve the loan.")
            assert result["extractable"] is True
            assert "nodes" in result
            assert result["prompt_version"] == "v1"

    def test_strips_markdown_fences(self):
        import json
        fenced = "```json\n" + json.dumps(VALID_EXTRACTION) + "\n```"
        with patch("prova.extraction.extractor.anthropic.Anthropic") as mock_anthropic:
            mock_client = MagicMock()
            mock_anthropic.return_value = mock_client
            mock_client.messages.create.return_value = self._mock_response(fenced)
            result = extract_argument_graph("Since X, therefore Y, thus Z.")
            assert result["extractable"] is True

    def test_empty_reasoning_raises(self):
        with pytest.raises(ValueError, match="empty"):
            extract_argument_graph("")

    def test_too_short_raises(self):
        with pytest.raises(ValueError):
            extract_argument_graph("short")

    def test_invalid_json_raises_extraction_error(self):
        with patch("prova.extraction.extractor.anthropic.Anthropic") as mock_anthropic:
            mock_client = MagicMock()
            mock_anthropic.return_value = mock_client
            mock_client.messages.create.return_value = self._mock_response("not json at all")
            with pytest.raises(ExtractionError, match="non-JSON"):
                extract_argument_graph("Since X is true, and Y follows, therefore Z.")

    def test_missing_keys_raises_extraction_error(self):
        import json
        with patch("prova.extraction.extractor.anthropic.Anthropic") as mock_anthropic:
            mock_client = MagicMock()
            mock_anthropic.return_value = mock_client
            mock_client.messages.create.return_value = self._mock_response(
                json.dumps({"extractable": True})  # missing required keys
            )
            with pytest.raises(ExtractionError, match="missing required keys"):
                extract_argument_graph("Since X is true, and Y follows, therefore Z.")
