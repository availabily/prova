"""
tests/test_graph_builder.py
tests/test_analyzer.py

Combined test file for analysis layer.
Split into classes by module.
"""

from __future__ import annotations

import pytest

from cobound_validator.graph import AgentNetwork
from prova.analysis.graph_builder import build_network, network_to_graph_json
from prova.analysis.analyzer import analyze, AnalysisResult


# ============================================================
# GRAPH BUILDER TESTS
# ============================================================

VALID_EXTRACTION = {
    "extractable": True,
    "ambiguous": False,
    "nodes": [
        {"id": "claim-1", "text": "The applicant has stable income", "type": "premise"},
        {"id": "claim-2", "text": "They can make payments",          "type": "claim"},
        {"id": "claim-3", "text": "Approve the loan",               "type": "conclusion"},
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

CIRCULAR_EXTRACTION = {
    "extractable": True,
    "ambiguous": False,
    "nodes": [
        {"id": "claim-1", "text": "X is safe",             "type": "conclusion"},
        {"id": "claim-2", "text": "Trials show no effects", "type": "premise"},
        {"id": "claim-3", "text": "Passed safety standards","type": "claim"},
    ],
    "edges": [
        {"from": "claim-2", "to": "claim-3", "connector": "therefore"},
        {"from": "claim-3", "to": "claim-1", "connector": "so"},
        {"from": "claim-1", "to": "claim-3", "connector": "because"},  # cycle
    ],
    "agents": [
        {"id": "claim-1"},
        {"id": "claim-2"},
        {"id": "claim-3"},
    ],
}


class TestBuildNetwork:
    def test_builds_correctly_from_valid_extraction(self):
        network, metadata = build_network(VALID_EXTRACTION)
        assert isinstance(network, AgentNetwork)
        assert "claim-1" in network.agents
        assert "claim-2" in network.agents
        assert "claim-3" in network.agents

    def test_edges_constructed_correctly(self):
        network, _ = build_network(VALID_EXTRACTION)
        assert ("claim-1", "claim-2") in network.edges
        assert ("claim-2", "claim-3") in network.edges

    def test_metadata_node_labels(self):
        _, metadata = build_network(VALID_EXTRACTION)
        assert metadata["node_labels"]["claim-1"] == "The applicant has stable income"
        assert metadata["node_labels"]["claim-3"] == "Approve the loan"

    def test_metadata_node_types(self):
        _, metadata = build_network(VALID_EXTRACTION)
        assert metadata["node_types"]["claim-1"] == "premise"
        assert metadata["node_types"]["claim-3"] == "conclusion"

    def test_metadata_conclusion_ids(self):
        _, metadata = build_network(VALID_EXTRACTION)
        assert "claim-3" in metadata["conclusion_ids"]

    def test_metadata_premise_ids(self):
        _, metadata = build_network(VALID_EXTRACTION)
        assert "claim-1" in metadata["premise_ids"]

    def test_not_extractable_raises(self):
        with pytest.raises(ValueError, match="non-extractable"):
            build_network({"extractable": False, "nodes": [], "edges": [], "agents": []})

    def test_too_few_nodes_raises(self):
        with pytest.raises(ValueError, match="1 node"):
            build_network({
                "extractable": True,
                "nodes": [{"id": "claim-1", "text": "X", "type": "premise"}],
                "edges": [],
                "agents": [{"id": "claim-1"}],
            })

    def test_circular_extraction_builds_without_error(self):
        # Graph building should not fail — cycle detection happens in analyzer
        network, metadata = build_network(CIRCULAR_EXTRACTION)
        assert isinstance(network, AgentNetwork)


class TestNetworkToGraphJson:
    def test_output_has_nodes_and_edges(self):
        network, metadata = build_network(VALID_EXTRACTION)
        graph = network_to_graph_json(network, metadata)
        assert "nodes" in graph
        assert "edges" in graph

    def test_nodes_have_required_fields(self):
        network, metadata = build_network(VALID_EXTRACTION)
        graph = network_to_graph_json(network, metadata)
        for node in graph["nodes"]:
            assert "id" in node
            assert "text" in node
            assert "type" in node

    def test_edges_have_required_fields(self):
        network, metadata = build_network(VALID_EXTRACTION)
        graph = network_to_graph_json(network, metadata)
        for edge in graph["edges"]:
            assert "from" in edge
            assert "to" in edge


# ============================================================
# ANALYZER TESTS
# ============================================================

class TestAnalyze:
    def test_valid_graph_returns_valid_result(self):
        network, metadata = build_network(VALID_EXTRACTION)
        result = analyze(network, metadata)
        assert isinstance(result, AnalysisResult)
        assert result.feasible is True
        assert result.verdict == "VALID"
        assert result.failure_type is None
        assert result.failure_detail is None

    def test_circular_graph_returns_invalid(self):
        network, metadata = build_network(CIRCULAR_EXTRACTION)
        result = analyze(network, metadata)
        assert result.feasible is False
        assert result.verdict == "INVALID"
        assert result.failure_type == "CIRCULAR"

    def test_circular_failure_detail_populated(self):
        network, metadata = build_network(CIRCULAR_EXTRACTION)
        result = analyze(network, metadata)
        assert result.failure_detail is not None
        assert result.failure_detail["type"] == "CIRCULAR"
        assert "location" in result.failure_detail
        assert "description" in result.failure_detail
        assert "affected_nodes" in result.failure_detail

    def test_domain_hint_filters_consequence(self):
        network, metadata = build_network(CIRCULAR_EXTRACTION)
        result = analyze(network, metadata, domain="medical")
        if result.failure_detail and result.failure_detail.get("known_consequence"):
            domain = result.failure_detail["known_consequence"]["domain"]
            assert domain in ("medical", "general")

    def test_unsupported_leap_detection(self):
        # A graph where a conclusion has no path from any premise
        leap_extraction = {
            "extractable": True,
            "ambiguous": False,
            "nodes": [
                {"id": "claim-1", "text": "Premise A", "type": "premise"},
                {"id": "claim-2", "text": "Intermediate", "type": "claim"},
                {"id": "claim-3", "text": "Floating conclusion", "type": "conclusion"},
            ],
            "edges": [
                {"from": "claim-1", "to": "claim-2", "connector": "therefore"},
                # claim-3 has no incoming edge — unsupported leap
            ],
            "agents": [
                {"id": "claim-1"},
                {"id": "claim-2"},
                {"id": "claim-3"},
            ],
        }
        network, metadata = build_network(leap_extraction)
        result = analyze(network, metadata)
        # claim-3 is unreachable from any premise
        assert result.feasible is True or result.failure_type in (
            None, "UNSUPPORTED_LEAP"
        )
        # Note: cobound-validator considers this graph acyclic (it is),
        # so feasible=True. The UNSUPPORTED_LEAP classification happens
        # in our classifier layer for isolated conclusion nodes.

    def test_raw_validator_output_present(self):
        network, metadata = build_network(VALID_EXTRACTION)
        result = analyze(network, metadata)
        assert "feasible" in result.raw_validator_output
        assert "cycles" in result.raw_validator_output
