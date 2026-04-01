"""
prova/extraction/validator.py

Confidence gate for extraction output.

Scores extraction quality and decides whether the result is trustworthy
enough to pass to the analysis engine. Below the threshold, the API returns
EXTRACTION_AMBIGUOUS rather than issuing a potentially wrong certificate.
"""

from __future__ import annotations

from typing import Any

# Minimum confidence score (0-100) required to proceed with analysis.
# Below this threshold the API returns EXTRACTION_AMBIGUOUS.
CONFIDENCE_THRESHOLD = 70


def score_extraction(extraction: dict[str, Any]) -> int:
    """Score extraction quality on a 0-100 scale.

    Scoring heuristics (all additive):

    Base score: 100
    Deductions:
      -30  if ambiguous flag is True
      -20  if fewer than 2 nodes (can't form a dependency)
      -15  if no edges (nodes but no connections)
      -10  if no premise nodes (nothing grounding the argument)
      -10  if no conclusion node (argument leads nowhere)
      -10  if any edge references a node ID not in nodes
      -5   if isolated nodes exist (nodes with no edges at all)

    Args:
        extraction: The dict returned by extract_argument_graph().

    Returns:
        Integer score 0-100. Higher is more trustworthy.
    """
    if not extraction.get("extractable", True):
        return 0

    score = 100
    nodes = extraction.get("nodes", [])
    edges = extraction.get("edges", [])
    node_ids = {n["id"] for n in nodes}

    # Ambiguity penalty
    if extraction.get("ambiguous", False):
        score -= 30

    # Too few nodes
    if len(nodes) < 2:
        score -= 20

    # No edges
    if len(edges) == 0:
        score -= 15

    # No premise nodes
    types = {n.get("type") for n in nodes}
    if "premise" not in types:
        score -= 10

    # No conclusion node
    if "conclusion" not in types:
        score -= 10

    # Edges referencing unknown node IDs
    dangling = [
        e for e in edges
        if e.get("from") not in node_ids or e.get("to") not in node_ids
    ]
    if dangling:
        score -= 10

    # Isolated nodes (appear in nodes list but in no edges)
    connected_ids: set[str] = set()
    for e in edges:
        connected_ids.add(e.get("from", ""))
        connected_ids.add(e.get("to", ""))
    isolated = [n for n in nodes if n["id"] not in connected_ids]
    if isolated:
        score -= 5

    return max(0, score)


def validate_extraction(extraction: dict[str, Any]) -> tuple[bool, int, str | None]:
    """Validate extraction and decide whether to proceed.

    Args:
        extraction: The dict returned by extract_argument_graph().

    Returns:
        A tuple of (passes, score, reason):
            passes (bool)       — True if extraction meets quality threshold
            score  (int)        — 0-100 confidence score
            reason (str | None) — human-readable reason if passes is False
    """
    # Not extractable at all
    if not extraction.get("extractable", True):
        return False, 0, (
            "Prova could not identify a logical dependency structure in this "
            "input. This may indicate the input is descriptive rather than "
            "argumentative. For best results, submit reasoning chains that "
            "include explicit claims and conclusions."
        )

    score = score_extraction(extraction)

    if score < CONFIDENCE_THRESHOLD:
        return False, score, (
            f"Multiple valid dependency structures were detected with low "
            f"confidence (score: {score}/100). The reasoning structure is "
            f"ambiguous. Consider submitting a more explicitly structured "
            f"reasoning chain, or break it into smaller sections."
        )

    return True, score, None
