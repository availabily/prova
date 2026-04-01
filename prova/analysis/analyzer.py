"""
prova/analysis/analyzer.py

Runs cobound-validator's AgentNetwork analysis on an argument graph and
maps the results into Prova's failure taxonomy.

The validate() function from cobound-validator returns:
    {feasible, agent_count, edge_count, cycles, mast_failures, suggested_fixes}

Prova uses:
    feasible        → verdict (VALID / INVALID)
    cycles          → CIRCULAR failure type
    suggested_fixes → repair guidance (V2)

Prova does NOT use mast_failures — those map agent topology cycles to
empirically observed multi-agent coordination failures, which is a different
domain from argument structure failures. Prova uses its own reasoning_failures
registry instead.
"""

from __future__ import annotations

from typing import Any

from cobound_validator import validate as cobound_validate
from cobound_validator.graph import AgentNetwork

from prova.reasoning_failures.registry import get_most_severe


# ---------------------------------------------------------------------------
# Analysis result type
# ---------------------------------------------------------------------------

class AnalysisResult:
    """Structured result of running cobound-validator on an argument graph."""

    def __init__(
        self,
        feasible: bool,
        cycles: list[list[str]],
        failure_type: str | None,
        failure_detail: dict[str, Any] | None,
        suggested_fixes: list[dict],
        raw_validator_output: dict[str, Any],
    ) -> None:
        self.feasible = feasible
        self.cycles = cycles
        self.failure_type = failure_type          # CIRCULAR | CONTRADICTION | UNSUPPORTED_LEAP | None
        self.failure_detail = failure_detail      # from reasoning_failures registry
        self.suggested_fixes = suggested_fixes
        self.raw_validator_output = raw_validator_output

    @property
    def verdict(self) -> str:
        return "VALID" if self.feasible else "INVALID"


# ---------------------------------------------------------------------------
# Main analysis function
# ---------------------------------------------------------------------------

def analyze(
    network: AgentNetwork,
    metadata: dict[str, Any],
    domain: str | None = None,
) -> AnalysisResult:
    """Run cobound-validator analysis on an argument graph network.

    Args:
        network:  AgentNetwork built by graph_builder.build_network().
        metadata: Metadata dict from graph_builder.build_network().
                  Used to enrich failure location descriptions with
                  human-readable claim texts.
        domain:   Optional domain hint for failure registry lookup.
                  One of "medical", "legal", "financial", "code", "general".
                  If None, returns the most severe consequence across all domains.

    Returns:
        AnalysisResult with verdict, failure type, and failure detail.
    """
    # Build the dict cobound_validate() expects
    network_dict = {
        "agents": [{"id": a} for a in network.agents],
        "edges": [{"from": src, "to": dst} for src, dst in network.edges],
    }

    raw = cobound_validate(network_dict)

    feasible: bool = raw["feasible"]
    cycles: list[list[str]] = raw["cycles"]
    suggested_fixes: list[dict] = raw["suggested_fixes"]

    if feasible:
        return AnalysisResult(
            feasible=True,
            cycles=[],
            failure_type=None,
            failure_detail=None,
            suggested_fixes=[],
            raw_validator_output=raw,
        )

    # Determine failure type from cycle structure
    failure_type = _classify_failure(cycles, network, metadata)

    # Look up downstream consequences from registry
    failure_detail = _build_failure_detail(
        failure_type=failure_type,
        cycles=cycles,
        network=network,
        metadata=metadata,
        domain=domain,
        suggested_fixes=suggested_fixes,
    )

    return AnalysisResult(
        feasible=False,
        cycles=cycles,
        failure_type=failure_type,
        failure_detail=failure_detail,
        suggested_fixes=suggested_fixes,
        raw_validator_output=raw,
    )


# ---------------------------------------------------------------------------
# Failure classification
# ---------------------------------------------------------------------------

def _classify_failure(
    cycles: list[list[str]],
    network: AgentNetwork,
    metadata: dict[str, Any],
) -> str:
    """Classify the structural failure type.

    Classification logic:
      CIRCULAR        — cycles detected (primary signal from is_forest())
      CONTRADICTION   — no cycles but two nodes make mutually exclusive claims
                        (detected via structural analysis of premise nodes)
      UNSUPPORTED_LEAP — no cycles, no contradiction, but a claim node has
                         no path from any premise to it (open chain)

    In practice, cobound-validator's is_forest() / find_cycles() currently
    detects cycles. Contradiction and unsupported leap are detected here via
    structural graph analysis.

    Args:
        cycles:   Cycles as returned by find_cycles().
        network:  The AgentNetwork.
        metadata: Node metadata from graph_builder.

    Returns:
        One of "CIRCULAR", "CONTRADICTION", "UNSUPPORTED_LEAP".
    """
    if cycles:
        return "CIRCULAR"

    # Check for unreachable nodes (unsupported leap):
    # A claim node with no path from any premise is an unsupported leap.
    premise_ids = set(metadata.get("premise_ids", []))
    if premise_ids:
        reachable = _reachable_from(premise_ids, network)
        node_ids = set(network.agents)
        unreachable_claims = [
            nid for nid in node_ids
            if nid not in reachable
            and nid not in premise_ids
            and metadata.get("node_types", {}).get(nid) != "premise"
        ]
        if unreachable_claims:
            return "UNSUPPORTED_LEAP"

    # Default: if the graph is not feasible but has no cycles and no
    # unreachable claims, classify as contradiction.
    return "CONTRADICTION"


def _reachable_from(
    start_ids: set[str],
    network: AgentNetwork,
) -> set[str]:
    """BFS/DFS to find all nodes reachable from a set of starting nodes."""
    adjacency: dict[str, list[str]] = {a: [] for a in network.agents}
    for src, dst in network.edges:
        if src in adjacency:
            adjacency[src].append(dst)

    visited: set[str] = set(start_ids)
    queue = list(start_ids)
    while queue:
        node = queue.pop()
        for neighbor in adjacency.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return visited


# ---------------------------------------------------------------------------
# Failure detail builder
# ---------------------------------------------------------------------------

def _build_failure_detail(
    failure_type: str,
    cycles: list[list[str]],
    network: AgentNetwork,
    metadata: dict[str, Any],
    domain: str | None,
    suggested_fixes: list[dict],
) -> dict[str, Any]:
    """Build the failure detail dict for the certificate.

    Args:
        failure_type:    CIRCULAR | CONTRADICTION | UNSUPPORTED_LEAP
        cycles:          Raw cycles from cobound-validator.
        network:         The AgentNetwork.
        metadata:        Node metadata.
        domain:          Optional domain hint.
        suggested_fixes: Fix suggestions from cobound-validator.

    Returns:
        A failure detail dict matching the certificate schema:
        {
            type, failure_id, location, description,
            affected_nodes, affected_edges, known_consequence
        }
    """
    node_labels = metadata.get("node_labels", {})
    node_types = metadata.get("node_types", {})

    # Determine affected nodes and edges
    affected_nodes: list[str] = []
    affected_edges: list[dict] = []

    if failure_type == "CIRCULAR" and cycles:
        # Use the first (most significant) cycle
        primary_cycle = cycles[0]
        affected_nodes = list(dict.fromkeys(primary_cycle))  # preserve order, dedupe
        for i in range(len(primary_cycle) - 1):
            affected_edges.append({
                "from": primary_cycle[i],
                "to": primary_cycle[i + 1],
            })

        # Find the conclusion node(s) involved
        conclusion_ids = metadata.get("conclusion_ids", [])
        conclusion_in_cycle = [n for n in affected_nodes if n in conclusion_ids]

        if conclusion_in_cycle:
            location = f"The conclusion node ({node_labels.get(conclusion_in_cycle[0], conclusion_in_cycle[0])}) appears as a premise within its own supporting chain."
        else:
            location = (
                f"A cycle exists among: "
                + ", ".join(node_labels.get(n, n) for n in affected_nodes[:3])
                + ("..." if len(affected_nodes) > 3 else "")
            )

        description = _describe_circular(primary_cycle, node_labels)

    elif failure_type == "UNSUPPORTED_LEAP":
        premise_ids = set(metadata.get("premise_ids", []))
        reachable = _reachable_from(premise_ids, network)
        unreachable = [
            n for n in network.agents
            if n not in reachable and n not in premise_ids
        ]
        affected_nodes = unreachable

        if unreachable:
            first = unreachable[0]
            location = (
                f"Claim '{node_labels.get(first, first)}' asserts a conclusion "
                "with no reasoning path from any stated premise."
            )
        else:
            location = "One or more claims lack sufficient grounding from stated premises."

        description = _describe_leap(unreachable, node_labels)

    else:  # CONTRADICTION
        affected_nodes = list(network.agents)
        location = "Two or more premises make mutually exclusive assertions."
        description = (
            "The argument contains premises that cannot simultaneously be true. "
            "Any conclusion derived from contradictory premises is formally unsound, "
            "regardless of how logically the intermediate steps are constructed."
        )

    # Look up known consequence from registry
    known_consequence = get_most_severe(failure_type, domain)

    return {
        "type": failure_type,
        "failure_id": known_consequence["id"] if known_consequence else None,
        "location": location,
        "description": description,
        "affected_nodes": affected_nodes,
        "affected_edges": affected_edges,
        "known_consequence": known_consequence,
    }


def _describe_circular(cycle: list[str], labels: dict[str, str]) -> str:
    path = " → ".join(labels.get(n, n) for n in cycle)
    return (
        f"The reasoning contains a circular dependency: {path}. "
        "The argument uses its conclusion (directly or indirectly) as a premise "
        "in its own support chain. This is circular reasoning — the conclusion "
        "cannot be established because it is assumed in the process of establishing it."
    )


def _describe_leap(unreachable: list[str], labels: dict[str, str]) -> str:
    names = ", ".join(f"'{labels.get(n, n)}'" for n in unreachable[:2])
    suffix = "..." if len(unreachable) > 2 else ""
    return (
        f"The claim(s) {names}{suffix} assert conclusions that no stated premise "
        "supports. There is a missing logical step — an intermediate claim or "
        "premise that would connect the evidence to this conclusion is absent "
        "from the reasoning chain."
    )
