#!/usr/bin/env python3
"""
scripts/test_extraction.py

Validates extract_argument_graph() against three representative reasoning
chains without hitting the live Anthropic API.

Each case mocks the API response, calls the extractor, prints the resulting
graph JSON, and classifies the structure:
  VALID             – acyclic graph, unambiguous
  CIRCULAR          – graph contains a directed cycle
  UNSUPPORTED_LEAP  – extractable but marked ambiguous (implicit premise leap)

Exit code: 0 if all classifications match expectations, 1 otherwise.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Allow running from any working directory inside the repo.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from prova.extraction.extractor import extract_argument_graph


# ---------------------------------------------------------------------------
# Mock helper
# ---------------------------------------------------------------------------

def _mock_message(payload: dict) -> MagicMock:
    """Return a fake anthropic.Message whose .content[0].text is JSON payload."""
    text_block = MagicMock()
    text_block.text = json.dumps(payload)
    message = MagicMock()
    message.content = [text_block]
    return message


# ---------------------------------------------------------------------------
# Graph analysis
# ---------------------------------------------------------------------------

def _has_cycle(edges: list[dict]) -> bool:
    """Return True if the directed edge list contains at least one cycle."""
    adj: dict[str, list[str]] = {}
    for e in edges:
        adj.setdefault(e["from"], []).append(e["to"])

    visited: set[str] = set()
    on_stack: set[str] = set()

    def dfs(node: str) -> bool:
        visited.add(node)
        on_stack.add(node)
        for neighbour in adj.get(node, []):
            if neighbour not in visited:
                if dfs(neighbour):
                    return True
            elif neighbour in on_stack:
                return True
        on_stack.discard(node)
        return False

    all_nodes: set[str] = set(adj.keys()) | {e["to"] for e in edges}
    return any(dfs(n) for n in all_nodes if n not in visited)


def _classify(graph: dict) -> str:
    """Return the structural classification of an extracted graph."""
    if not graph.get("extractable"):
        return "NOT_EXTRACTABLE"
    if _has_cycle(graph.get("edges", [])):
        return "CIRCULAR"
    if graph.get("ambiguous"):
        return "UNSUPPORTED_LEAP"
    return "VALID"


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------

CASES = [
    # ------------------------------------------------------------------
    # 1. VALID — linear loan-approval logic
    #    Acyclic chain: employment → income → can-service → low-risk → approve
    # ------------------------------------------------------------------
    {
        "label": "VALID — Linear loan approval",
        "expected_class": "VALID",
        "reasoning": (
            "The applicant has a steady employment history of 5 years. "
            "Steady employment indicates reliable income. "
            "Reliable income means the applicant can service the loan. "
            "Since the applicant can service the loan, the default risk is low. "
            "Low default risk meets our lending criteria. "
            "Therefore, the loan should be approved."
        ),
        "mock_payload": {
            "extractable": True,
            "ambiguous": False,
            "nodes": [
                {
                    "id": "claim-1",
                    "text": "The applicant has a steady employment history of 5 years",
                    "type": "premise",
                },
                {
                    "id": "claim-2",
                    "text": "Steady employment indicates reliable income",
                    "type": "premise",
                },
                {
                    "id": "claim-3",
                    "text": "The applicant has reliable income",
                    "type": "claim",
                },
                {
                    "id": "claim-4",
                    "text": "The applicant can service the loan",
                    "type": "claim",
                },
                {
                    "id": "claim-5",
                    "text": "The default risk is low",
                    "type": "claim",
                },
                {
                    "id": "claim-6",
                    "text": "Low default risk meets our lending criteria",
                    "type": "premise",
                },
                {
                    "id": "claim-7",
                    "text": "The loan should be approved",
                    "type": "conclusion",
                },
            ],
            "edges": [
                {"from": "claim-1", "to": "claim-3", "connector": "since"},
                {"from": "claim-2", "to": "claim-3", "connector": "implies"},
                {"from": "claim-3", "to": "claim-4", "connector": "therefore"},
                {"from": "claim-4", "to": "claim-5", "connector": "since"},
                {"from": "claim-5", "to": "claim-7", "connector": "therefore"},
                {"from": "claim-6", "to": "claim-7", "connector": "therefore"},
            ],
            "agents": [
                {"id": "claim-1"},
                {"id": "claim-2"},
                {"id": "claim-3"},
                {"id": "claim-4"},
                {"id": "claim-5"},
                {"id": "claim-6"},
                {"id": "claim-7"},
            ],
        },
    },

    # ------------------------------------------------------------------
    # 2. CIRCULAR — treatment-safety tautology
    #    safe → prescribed-safely → doctors-consider-safe → safe (cycle)
    # ------------------------------------------------------------------
    {
        "label": "CIRCULAR — Treatment safety tautology",
        "expected_class": "CIRCULAR",
        "reasoning": (
            "This drug is safe to prescribe because it has been prescribed "
            "safely for years. We know it has been prescribed safely for years "
            "because doctors consider it safe. Doctors consider it safe because "
            "it is safe to prescribe."
        ),
        "mock_payload": {
            "extractable": True,
            "ambiguous": False,
            "nodes": [
                {
                    "id": "claim-1",
                    "text": "This drug is safe to prescribe",
                    "type": "conclusion",
                },
                {
                    "id": "claim-2",
                    "text": "It has been prescribed safely for years",
                    "type": "claim",
                },
                {
                    "id": "claim-3",
                    "text": "Doctors consider it safe",
                    "type": "claim",
                },
            ],
            "edges": [
                # claim-2 supports claim-1
                {"from": "claim-2", "to": "claim-1", "connector": "because"},
                # claim-3 supports claim-2
                {"from": "claim-3", "to": "claim-2", "connector": "because"},
                # claim-1 supports claim-3 — closes the cycle
                {"from": "claim-1", "to": "claim-3", "connector": "because"},
            ],
            "agents": [
                {"id": "claim-1"},
                {"id": "claim-2"},
                {"id": "claim-3"},
            ],
        },
    },

    # ------------------------------------------------------------------
    # 3. UNSUPPORTED_LEAP — one-quarter profits → invest all savings
    #    Extractable but ambiguous: the leap from short-term profits to
    #    "invest all savings" is not bridged by stated premises.
    # ------------------------------------------------------------------
    {
        "label": "UNSUPPORTED_LEAP — Profits-to-investment conclusion",
        "expected_class": "UNSUPPORTED_LEAP",
        "reasoning": (
            "The company reported record profits last quarter. "
            "Record profits show strong management. "
            "Therefore, we should invest all our savings in this company immediately."
        ),
        "mock_payload": {
            "extractable": True,
            "ambiguous": True,   # extractor flags the inferential gap
            "nodes": [
                {
                    "id": "claim-1",
                    "text": "The company reported record profits last quarter",
                    "type": "premise",
                },
                {
                    "id": "claim-2",
                    "text": "Record profits show strong management",
                    "type": "claim",
                },
                {
                    "id": "claim-3",
                    "text": "Strong management guarantees future performance",
                    "type": "premise",  # implicit, unstated — hence ambiguous
                },
                {
                    "id": "claim-4",
                    "text": "We should invest all our savings in this company immediately",
                    "type": "conclusion",
                },
            ],
            "edges": [
                {"from": "claim-1", "to": "claim-2", "connector": "therefore"},
                {"from": "claim-2", "to": "claim-3", "connector": "implies"},
                {"from": "claim-3", "to": "claim-4", "connector": "therefore"},
            ],
            "agents": [
                {"id": "claim-1"},
                {"id": "claim-2"},
                {"id": "claim-3"},
                {"id": "claim-4"},
            ],
        },
    },
]


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run() -> bool:
    os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-not-used")

    all_passed = True

    for i, case in enumerate(CASES, 1):
        sep = "=" * 70
        print(f"\n{sep}")
        print(f"Test {i}: {case['label']}")
        print(sep)
        print(f"Reasoning: {case['reasoning'][:120]}...")

        mock_message = _mock_message(case["mock_payload"])

        with patch("anthropic.Anthropic") as MockAnthropic:
            mock_client = MagicMock()
            MockAnthropic.return_value = mock_client
            mock_client.messages.create.return_value = mock_message

            graph = extract_argument_graph(case["reasoning"])

        print("\nExtracted graph JSON:")
        print(json.dumps(graph, indent=2))

        classification = _classify(graph)
        passed = classification == case["expected_class"]
        all_passed = all_passed and passed

        print(f"\nClassification : {classification}")
        print(f"Expected       : {case['expected_class']}")
        print(f"Result         : {'PASS' if passed else 'FAIL'}")

    print(f"\n{'=' * 70}")
    summary = "ALL TESTS PASSED" if all_passed else "SOME TESTS FAILED"
    print(summary)
    print("=" * 70)
    return all_passed


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
