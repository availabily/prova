"""
prova/analysis/repair.py

Generates repair suggestions for INVALID reasoning chains using Claude API.

When the analysis finds failures/flaws, this module calls Claude with the
original reasoning chain and identified flaws to produce structured repair
suggestions. Each suggestion identifies the problematic step, the issue,
and a revised version of that step.

Only called when verdict is INVALID — VALID chains need no repairs.
"""

from __future__ import annotations

import json
import os
from typing import Any

import anthropic


# ---------------------------------------------------------------------------
# System prompt (exact per spec)
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are a logical reasoning repair specialist. Given a reasoning chain "
    "and its identified flaws, output a JSON array of repair suggestions. "
    'Each item: {step_index: number, issue: string, suggestion: string, '
    'revised_step: string}. Output JSON only.'
)


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

def generate_repair_suggestions(
    reasoning: str,
    failure: dict[str, Any],
    argument_graph: dict[str, Any],
) -> list[dict[str, Any]] | None:
    """Call Claude API to generate repair suggestions for a failed reasoning chain.

    Args:
        reasoning:      The original reasoning chain text.
        failure:        The failure detail dict from analyzer.analyze().
                        Contains type, location, description, affected_nodes, etc.
        argument_graph: The argument graph dict with nodes and edges.

    Returns:
        A list of repair suggestion dicts, each with:
            step_index   (int)    — index of the problematic step in the chain
            issue        (str)    — description of the issue found
            suggestion   (str)    — how to fix the issue
            revised_step (str)    — the corrected version of the step

        Returns None if the API call fails (non-blocking — repairs are optional).
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    # Build the user message with the reasoning chain and flaws
    flaws_summary = {
        "failure_type": failure.get("type"),
        "location": failure.get("location"),
        "description": failure.get("description"),
        "affected_nodes": failure.get("affected_nodes", []),
    }

    # Include node labels for step_index mapping
    nodes = argument_graph.get("nodes", [])
    node_info = [
        {"index": i, "id": n.get("id"), "text": n.get("text"), "type": n.get("type")}
        for i, n in enumerate(nodes)
    ]

    user_message = (
        f"REASONING CHAIN:\n{reasoning}\n\n"
        f"IDENTIFIED FLAWS:\n{json.dumps(flaws_summary, indent=2)}\n\n"
        f"ARGUMENT STEPS:\n{json.dumps(node_info, indent=2)}"
    )

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": user_message}
            ],
        )
    except Exception:
        # Non-blocking: if Claude API fails, repairs are simply unavailable
        return None

    raw = message.content[0].text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.splitlines()
        inner = [ln for ln in lines if not ln.strip().startswith("```")]
        raw = "\n".join(inner).strip()

    try:
        suggestions = json.loads(raw)
    except json.JSONDecodeError:
        return None

    # Validate structure
    if not isinstance(suggestions, list):
        return None

    valid = []
    for item in suggestions:
        if (
            isinstance(item, dict)
            and "step_index" in item
            and "issue" in item
            and "suggestion" in item
            and "revised_step" in item
        ):
            valid.append({
                "step_index": item["step_index"],
                "issue": str(item["issue"]),
                "suggestion": str(item["suggestion"]),
                "revised_step": str(item["revised_step"]),
            })

    return valid if valid else None
