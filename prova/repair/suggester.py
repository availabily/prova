"""
prova/repair/suggester.py

Generates step-level reasoning repair suggestions using Claude when analysis
finds structural flaws.
"""

from __future__ import annotations

import json
import os
from typing import Any

import anthropic

_SYSTEM_PROMPT = (
    "You are a logical reasoning repair specialist. Given a reasoning chain and its "
    "identified flaws, output a JSON array of repair suggestions. Each item: "
    "{step_index: number, issue: string, suggestion: string, revised_step: string}. "
    "Output JSON only."
)


def generate_repair_suggestions(
    reasoning: str,
    flaws: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return repair suggestions for an invalid reasoning chain.

    Args:
        reasoning: Original submitted reasoning chain.
        flaws: Existing analysis flaws array.

    Returns:
        JSON-parsed suggestions list; empty list on parse/API failure.
    """
    if not flaws:
        return []

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    user_message = json.dumps(
        {
            "reasoning_chain": reasoning,
            "flaws": flaws,
        },
        ensure_ascii=False,
    )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = message.content[0].text.strip()
    except Exception:
        return []

    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(line for line in lines if not line.strip().startswith("```")).strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []

    if not isinstance(parsed, list):
        return []

    cleaned: list[dict[str, Any]] = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        if {"step_index", "issue", "suggestion", "revised_step"} - set(item.keys()):
            continue
        cleaned.append(
            {
                "step_index": item["step_index"],
                "issue": str(item["issue"]),
                "suggestion": str(item["suggestion"]),
                "revised_step": str(item["revised_step"]),
            }
        )
    return cleaned
