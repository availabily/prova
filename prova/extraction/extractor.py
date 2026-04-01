"""
prova/extraction/extractor.py

Calls the Anthropic API to extract a logical dependency graph from a
natural language reasoning chain.

The extraction prompt converts reasoning text into a structured JSON graph
matching the AgentNetwork.from_dict() input schema required by
cobound-validator.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import anthropic

# ---------------------------------------------------------------------------
# Prompt loading
# ---------------------------------------------------------------------------

_PROMPT_PATH = Path(__file__).parent / "prompt_v1.txt"
_PROMPT_VERSION = "v1"


def _load_prompt() -> str:
    """Load the extraction prompt from disk.

    Raises:
        FileNotFoundError: If prompt_v1.txt is missing.
    """
    if not _PROMPT_PATH.exists():
        raise FileNotFoundError(
            f"Extraction prompt not found at {_PROMPT_PATH}. "
            "Ensure prompt_v1.txt is present in the extraction/ directory."
        )
    return _PROMPT_PATH.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

def extract_argument_graph(
    reasoning: str,
    format_hint: str = "auto",
) -> dict[str, Any]:
    """Extract a logical dependency graph from a reasoning chain.

    Calls the Claude API with the extraction prompt, parses the JSON response,
    and returns a structured graph dict.

    Args:
        reasoning:   The natural language reasoning chain to extract from.
        format_hint: One of "auto", "structured" (numbered steps), or "prose".
                     Currently used as a hint in error messages; the prompt
                     handles all formats automatically.

    Returns:
        A dict with keys:
            extractable    (bool)  — False if no logical structure found
            ambiguous      (bool)  — True if structure was uncertain
            nodes          (list)  — list of {"id", "text", "type"} dicts
            edges          (list)  — list of {"from", "to", "connector"} dicts
            agents         (list)  — list of {"id"} dicts (mirrors nodes)
            prompt_version (str)   — extraction prompt version used

    Raises:
        ExtractionError: If the API call fails or returns unparseable output.
        ValueError:      If reasoning is empty or too short.
    """
    reasoning = reasoning.strip()
    if not reasoning:
        raise ValueError("Reasoning chain cannot be empty.")
    if len(reasoning) < 20:
        raise ValueError(
            "Reasoning chain is too short to contain a logical structure. "
            "Minimum 20 characters required."
        )

    prompt_template = _load_prompt()
    prompt = prompt_template.replace("[REASONING_CHAIN]", reasoning)

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt}
            ],
        )
    except anthropic.APIConnectionError as exc:
        raise ExtractionError(
            f"Failed to connect to Anthropic API: {exc}"
        ) from exc
    except anthropic.RateLimitError as exc:
        raise ExtractionError(
            "Anthropic API rate limit reached. Please retry shortly."
        ) from exc
    except anthropic.APIStatusError as exc:
        raise ExtractionError(
            f"Anthropic API returned status {exc.status_code}: {exc.message}"
        ) from exc

    raw = message.content[0].text.strip()

    # Strip markdown code fences if model adds them despite instructions
    if raw.startswith("```"):
        lines = raw.splitlines()
        inner = [ln for ln in lines if not ln.strip().startswith("```")]
        raw = "\n".join(inner).strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ExtractionError(
            f"Extraction returned non-JSON output. Raw response: {raw[:500]}"
        ) from exc

    # Validate required keys are present
    required = {"extractable", "ambiguous", "nodes", "edges", "agents"}
    missing = required - set(data.keys())
    if missing:
        raise ExtractionError(
            f"Extraction response missing required keys: {missing}. "
            f"Raw response: {raw[:500]}"
        )

    # Attach prompt version for certificate versioning
    data["prompt_version"] = _PROMPT_VERSION

    return data


# ---------------------------------------------------------------------------
# Error type
# ---------------------------------------------------------------------------

class ExtractionError(Exception):
    """Raised when the extraction API call or response parsing fails."""
    pass
