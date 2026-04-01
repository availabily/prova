"""
prova/analysis/graph_builder.py

Converts extraction output from extractor.py into the AgentNetwork format
expected by cobound-validator's AgentNetwork.from_dict().

The extraction output uses full claim texts as node IDs. This module maps
those to stable short IDs (claim-1, claim-2, ...) and maintains a label
lookup so claim texts can be shown in certificates and failure diagnostics.

AgentNetwork.from_dict() expected schema:
    {
        "agents": [{"id": "claim-1"}, {"id": "claim-2"}],
        "edges":  [{"from": "claim-1", "to": "claim-2"}]
    }
"""

from __future__ import annotations

from typing import Any

from cobound_validator.graph import AgentNetwork


def build_network(extraction: dict[str, Any]) -> tuple[AgentNetwork, dict[str, Any]]:
    """Build an AgentNetwork and a node metadata map from extraction output.

    Args:
        extraction: The dict returned by extractor.extract_argument_graph().
                    Must have extractable=True and pass the confidence gate.

    Returns:
        A tuple of:
            network  (AgentNetwork)  — ready to pass to AgentNetwork.validate()
                                       via cobound_validator.validate()
            metadata (dict)          — node labels and types keyed by node ID,
                                       used when rendering certificates and
                                       failure diagnostics.

            metadata shape:
            {
                "node_labels": {"claim-1": "full claim text", ...},
                "node_types":  {"claim-1": "premise|claim|conclusion", ...},
                "conclusion_ids": ["claim-5"],   # IDs typed as conclusion
                "premise_ids":    ["claim-1"],   # IDs typed as premise
            }

    Raises:
        ValueError: If extraction is not extractable or has no nodes/edges.
    """
    if not extraction.get("extractable", False):
        raise ValueError(
            "Cannot build network from non-extractable output. "
            "Check that the confidence gate passed before calling build_network."
        )

    nodes = extraction.get("nodes", [])
    edges = extraction.get("edges", [])

    if len(nodes) < 2:
        raise ValueError(
            f"Extraction produced {len(nodes)} node(s); "
            "at least 2 are required to form a dependency graph."
        )

    # Build AgentNetwork-compatible dict directly from extraction output.
    # The extraction prompt guarantees that the "agents" array mirrors
    # the "nodes" array IDs exactly, so we can use extraction["agents"]
    # directly for the AgentNetwork agents list.
    agents_list = extraction.get("agents", [])

    # Normalise: ensure each entry is {"id": str}
    normalised_agents = []
    for entry in agents_list:
        if isinstance(entry, dict) and "id" in entry:
            normalised_agents.append({"id": str(entry["id"])})
        else:
            normalised_agents.append({"id": str(entry)})

    # Build edges in AgentNetwork format: {"from": id, "to": id}
    normalised_edges = []
    for edge in edges:
        from_id = edge.get("from", "")
        to_id = edge.get("to", "")
        if from_id and to_id:
            normalised_edges.append({"from": str(from_id), "to": str(to_id)})

    network_dict = {
        "agents": normalised_agents,
        "edges": normalised_edges,
    }

    network = AgentNetwork.from_dict(network_dict)

    # Build metadata map for certificate rendering
    node_labels: dict[str, str] = {}
    node_types: dict[str, str] = {}
    conclusion_ids: list[str] = []
    premise_ids: list[str] = []

    for node in nodes:
        nid = str(node.get("id", ""))
        node_labels[nid] = node.get("text", nid)
        ntype = node.get("type", "claim")
        node_types[nid] = ntype
        if ntype == "conclusion":
            conclusion_ids.append(nid)
        elif ntype == "premise":
            premise_ids.append(nid)

    metadata = {
        "node_labels": node_labels,
        "node_types": node_types,
        "conclusion_ids": conclusion_ids,
        "premise_ids": premise_ids,
    }

    return network, metadata


def network_to_graph_json(
    network: AgentNetwork,
    metadata: dict[str, Any],
) -> dict[str, Any]:
    """Serialize network + metadata into the argument_graph field of a certificate.

    This is the graph JSON stored in the certificate and returned in the API
    response. It is also what the frontend D3 visualization consumes.

    Args:
        network:  AgentNetwork instance.
        metadata: Metadata dict from build_network().

    Returns:
        A dict with "nodes" and "edges" arrays suitable for D3 rendering and
        JSON storage.
    """
    node_labels = metadata.get("node_labels", {})
    node_types = metadata.get("node_types", {})

    nodes = [
        {
            "id": agent_id,
            "text": node_labels.get(agent_id, agent_id),
            "type": node_types.get(agent_id, "claim"),
        }
        for agent_id in network.agents
    ]

    edges = [
        {"from": src, "to": dst}
        for src, dst in network.edges
    ]

    return {"nodes": nodes, "edges": edges}
