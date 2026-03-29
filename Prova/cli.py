"""
prova/cli.py

Command-line interface for Prova.

Entry point: prova

Usage:
  prova verify <reasoning.txt>
  prova verify - (reads from stdin)
  prova verify <reasoning.txt> --format json
  prova verify <reasoning.txt> --domain medical

Exit codes:
  0   VALID   — reasoning is logically sound
  1   INVALID — reasoning has structural failure
  2   ERROR   — input or analysis failure
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import click

from prova.certificate.versioning import PROVA_VERSION, get_validator_version


@click.group()
@click.version_option(
    version=PROVA_VERSION,
    prog_name="prova",
    message="prova %(version)s (validator %(validator_version)s)",
    extra_info={"validator_version": get_validator_version()},
)
def cli() -> None:
    """Prova — Formally verified reasoning validator.

    Analyzes AI reasoning chains for logical structural validity.
    Backed by 2,400+ formally verified Lean 4 theorems.

    Mathematical foundation: H¹(K;ℤ) = 0 ⟺ argument is structurally valid.
    """
    pass


@cli.command("verify")
@click.argument("input", default="-")
@click.option(
    "--format", "output_format",
    type=click.Choice(["text", "json"], case_sensitive=False),
    default="text",
    show_default=True,
    help="Output format.",
)
@click.option(
    "--domain",
    type=click.Choice(["medical", "legal", "financial", "code", "general"], case_sensitive=False),
    default=None,
    help="Domain hint for failure consequence mapping.",
)
@click.option(
    "--no-retain",
    is_flag=True,
    default=False,
    help="Do not store the reasoning chain in the certificate.",
)
def verify(input: str, output_format: str, domain: str | None, no_retain: bool) -> None:
    """Verify a reasoning chain from a file or stdin.

    INPUT is a file path or '-' to read from stdin.

    Exit codes: 0 = VALID, 1 = INVALID, 2 = ERROR.

    Examples:

      prova verify reasoning.txt

      cat reasoning.txt | prova verify -

      prova verify reasoning.txt --format json

      prova verify reasoning.txt --domain medical
    """
    # ── Check API key ──────────────────────────────────────────────────
    api_key = os.environ.get("PROVA_API_KEY")
    api_base = os.environ.get("PROVA_API_URL", "https://api.prova.cobound.dev")

    # ── Read input ─────────────────────────────────────────────────────
    try:
        if input == "-":
            reasoning = sys.stdin.read()
        else:
            path = Path(input)
            if not path.exists():
                click.echo(f"ERROR: File not found: {input}", err=True)
                sys.exit(2)
            reasoning = path.read_text(encoding="utf-8")
    except Exception as exc:
        click.echo(f"ERROR reading input: {exc}", err=True)
        sys.exit(2)

    reasoning = reasoning.strip()
    if not reasoning:
        click.echo("ERROR: Empty input.", err=True)
        sys.exit(2)

    # ── Call API ───────────────────────────────────────────────────────
    try:
        import urllib.request
        import urllib.error

        payload = json.dumps({
            "reasoning": reasoning,
            "retain": not no_retain,
            "metadata": {"domain": domain} if domain else {},
        }).encode("utf-8")

        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        req = urllib.request.Request(
            f"{api_base}/verify",
            data=payload,
            headers=headers,
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))

    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            err = json.loads(body)
            click.echo(f"ERROR: {err.get('error', 'UNKNOWN')} — {err.get('message', body)}", err=True)
        except json.JSONDecodeError:
            click.echo(f"ERROR: HTTP {exc.code} — {body[:200]}", err=True)
        sys.exit(2)
    except Exception as exc:
        click.echo(f"ERROR: {exc}", err=True)
        sys.exit(2)

    # ── Output ─────────────────────────────────────────────────────────
    if output_format == "json":
        click.echo(json.dumps(result, indent=2))
    else:
        _print_text_report(result)

    # ── Exit code ──────────────────────────────────────────────────────
    sys.exit(0 if result.get("verdict") == "VALID" else 1)


def _print_text_report(result: dict) -> None:
    """Print a human-readable certificate report."""
    WIDTH = 62
    title = " PROVA — Reasoning Validity Certificate "
    pad = WIDTH - len(title)
    lp = pad // 2
    rp = pad - lp

    click.echo("\n╔" + "═" * WIDTH + "╗")
    click.echo("║" + " " * lp + title + " " * rp + "║")
    click.echo("╚" + "═" * WIDTH + "╝\n")

    click.echo(f"  Certificate:  {result.get('certificate_id', 'N/A')}")
    click.echo(f"  Timestamp:    {result.get('timestamp', 'N/A')}")
    click.echo(f"  Confidence:   {result.get('confidence_score', 0)}/100")
    click.echo(f"  Prova:        v{result.get('prova_version', '?')}  "
               f"Validator: v{result.get('validator_version', '?')}")
    click.echo("")

    verdict = result.get("verdict", "UNKNOWN")
    if verdict == "VALID":
        click.echo("  VERDICT: ✓ VALID — reasoning structure is sound")
    else:
        click.echo("  VERDICT: ✗ INVALID — reasoning structure has a failure")

    click.echo("")

    failure = result.get("failure")
    if failure:
        click.echo(f"  Failure type: {failure.get('type', 'UNKNOWN')}")
        click.echo(f"  Location:     {failure.get('location', '')}")
        click.echo("")
        desc = failure.get("description", "")
        # Word-wrap at 56 chars
        words = desc.split()
        line = "  "
        for word in words:
            if len(line) + len(word) + 1 > 60:
                click.echo(line)
                line = "  " + word
            else:
                line += (" " if line.strip() else "") + word
        if line.strip():
            click.echo(line)
        click.echo("")

        consequence = failure.get("known_consequence")
        if consequence:
            click.echo(f"  Known consequence ({consequence.get('severity', '').upper()}):")
            click.echo(f"  {consequence.get('name', '')}")
            click.echo("")

    url = result.get("certificate_url", "")
    if url:
        click.echo(f"  Certificate URL: {url}")

    sha = result.get("sha256", "")
    if sha:
        click.echo(f"  SHA-256: {sha[:32]}...")

    click.echo("")
    click.echo(
        "  Note: This certificate verifies logical structure only.\n"
        "  It does not verify factual accuracy or fitness for purpose."
    )
    click.echo("")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    cli()


if __name__ == "__main__":
    main()
