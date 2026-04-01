"""
prova/reasoning_failures/registry.py

Maps structural failure types detected by the cobound-validator analysis
engine to known downstream consequences in AI decision systems.

Analogous to cobound_validator/mast.py (which maps agent topology cycles
to MAST failure modes), but scoped to argument structure failures rather
than multi-agent coordination failures.

Three failure types:
  CIRCULAR        — cycle detected in argument graph (H¹ ≠ 0)
  CONTRADICTION   — mutually exclusive claims both treated as valid premises
  UNSUPPORTED_LEAP — claim asserts support from prior claims that don't
                     actually provide it (open chain, delta residue non-zero)
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

REASONING_FAILURES: dict[str, list[dict[str, Any]]] = {
    "CIRCULAR": [
        {
            "id": "CIRC-001",
            "domain": "medical",
            "name": "Diagnostic Anchoring",
            "consequence": (
                "AI reinforces initial hypothesis by treating an unverified "
                "conclusion as an established premise, ignoring contradicting "
                "evidence and locking in a potentially incorrect diagnosis."
            ),
            "severity": "critical",
        },
        {
            "id": "CIRC-002",
            "domain": "legal",
            "name": "False Precedent Circularity",
            "consequence": (
                "AI cites a conclusion as established law when that law was "
                "itself derived from the conclusion being argued, producing a "
                "legally unsound argument that cannot withstand scrutiny."
            ),
            "severity": "critical",
        },
        {
            "id": "CIRC-003",
            "domain": "financial",
            "name": "Risk Tautology",
            "consequence": (
                "Risk assessment references its own output as an input to "
                "justify confidence scores, making the assessment "
                "self-sealing and immune to disconfirming evidence."
            ),
            "severity": "high",
        },
        {
            "id": "CIRC-004",
            "domain": "general",
            "name": "Goal Drift Justification",
            "consequence": (
                "Agent justifies pursuing a subgoal by appealing to achieving "
                "the main goal, which itself depends on the subgoal, creating "
                "an internally consistent but groundless justification loop."
            ),
            "severity": "high",
        },
    ],
    "CONTRADICTION": [
        {
            "id": "CONT-001",
            "domain": "medical",
            "name": "Inconsistent Treatment Recommendation",
            "consequence": (
                "Two valid premises simultaneously produce contradictory "
                "action directives — e.g. prescribe and withhold the same "
                "treatment — with no mechanism to resolve the conflict."
            ),
            "severity": "critical",
        },
        {
            "id": "CONT-002",
            "domain": "legal",
            "name": "Opposing Clause Activation",
            "consequence": (
                "Analysis simultaneously triggers mutually exclusive "
                "contractual or statutory obligations, producing a legally "
                "incoherent recommendation that cannot be executed."
            ),
            "severity": "critical",
        },
        {
            "id": "CONT-003",
            "domain": "financial",
            "name": "Conflicting Position Signals",
            "consequence": (
                "System simultaneously recommends opposing actions on the "
                "same instrument or portfolio, making the recommendation "
                "unactionable and exposing the system to dispute."
            ),
            "severity": "critical",
        },
        {
            "id": "CONT-004",
            "domain": "general",
            "name": "Inconsistent World State",
            "consequence": (
                "Contradictory ground truth premises produce a world model "
                "that cannot be consistently acted upon; any decision "
                "derived from this model violates at least one stated fact."
            ),
            "severity": "high",
        },
    ],
    "UNSUPPORTED_LEAP": [
        {
            "id": "LEAP-001",
            "domain": "medical",
            "name": "Ungrounded Severity Escalation",
            "consequence": (
                "AI jumps from a symptom observation to a high-risk diagnosis "
                "without intermediate clinical reasoning, bypassing the "
                "inferential steps that would catch false positives."
            ),
            "severity": "critical",
        },
        {
            "id": "LEAP-002",
            "domain": "legal",
            "name": "Unsupported Liability Attribution",
            "consequence": (
                "Conclusion assigns fault or liability without a reasoning "
                "chain that connects the evidence to the applicable legal "
                "standard, making the conclusion legally indefensible."
            ),
            "severity": "high",
        },
        {
            "id": "LEAP-003",
            "domain": "financial",
            "name": "Unjustified Confidence",
            "consequence": (
                "Model states a high-confidence prediction with a reasoning "
                "chain that does not structurally support that confidence "
                "level, miscalibrating downstream risk decisions."
            ),
            "severity": "high",
        },
        {
            "id": "LEAP-004",
            "domain": "code",
            "name": "Security Misclassification",
            "consequence": (
                "Vulnerability flagged as critical without a reasoning chain "
                "connecting the observed behaviour to the severity criteria, "
                "wasting remediation resources or missing real threats."
            ),
            "severity": "high",
        },
    ],
}

# Severity ordering for sorting (lower = more severe)
_SEVERITY_RANK: dict[str, int] = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def map_failure(
    failure_type: str,
    domain: str | None = None,
) -> list[dict[str, Any]]:
    """Return known downstream consequences for a structural failure type.

    Args:
        failure_type: One of "CIRCULAR", "CONTRADICTION", "UNSUPPORTED_LEAP".
        domain:       Optional filter — "medical", "legal", "financial",
                      "code", or "general". When provided, returns only
                      entries matching this domain or domain="general".

    Returns:
        List of failure consequence dicts. Empty list if failure_type unknown.
    """
    failures = REASONING_FAILURES.get(failure_type, [])
    if domain:
        failures = [
            f for f in failures
            if f["domain"] == domain or f["domain"] == "general"
        ]
    return failures


def get_most_severe(
    failure_type: str,
    domain: str | None = None,
) -> dict[str, Any] | None:
    """Return the highest-severity consequence for a failure type.

    Args:
        failure_type: One of "CIRCULAR", "CONTRADICTION", "UNSUPPORTED_LEAP".
        domain:       Optional domain filter (see map_failure).

    Returns:
        The most severe failure consequence dict, or None if not found.
    """
    failures = map_failure(failure_type, domain)
    if not failures:
        return None
    return min(failures, key=lambda f: _SEVERITY_RANK.get(f["severity"], 99))


def all_failure_types() -> list[str]:
    """Return all registered failure type keys."""
    return list(REASONING_FAILURES.keys())
