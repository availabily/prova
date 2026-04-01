"""
prova/storage/pdf.py

Server-side PDF certificate generation using ReportLab.

Generates a deterministic, legally-formatted PDF for each certificate.
The PDF is identical on every download — generated once at certificate
creation time and stored in Supabase Storage.

PDF contents (per design spec):
  - Header: Prova wordmark + Certificate ID
  - Timestamp in full legal format
  - Verdict in large type
  - Confidence score
  - Argument graph as static table (nodes + edges)
  - Original reasoning chain (omitted if retain=false)
  - Failure diagnosis block (INVALID only)
  - Footer: Certificate URL + SHA-256 hash + scope disclaimer
"""

from __future__ import annotations

import io
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ---------------------------------------------------------------------------
# Colour palette (matches web design spec)
# ---------------------------------------------------------------------------

_BLACK      = colors.HexColor("#0A0A0A")
_WHITE      = colors.HexColor("#FFFFFF")
_GREEN      = colors.HexColor("#22C55E")
_RED        = colors.HexColor("#EF4444")
_GREY       = colors.HexColor("#6B7280")
_LIGHT_GREY = colors.HexColor("#F3F4F6")


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_pdf(certificate: dict[str, Any]) -> bytes:
    """Generate a PDF certificate and return it as bytes.

    Args:
        certificate: The complete certificate dict from generator.py.

    Returns:
        PDF file contents as bytes. Store in Supabase Storage.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        title=f"Prova Certificate {certificate['certificate_id']}",
        author="Prova — prova.cobound.dev",
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ────────────────────────────────────────────────────────
    story.append(_header_block(certificate, styles))
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=_BLACK))
    story.append(Spacer(1, 0.4 * cm))

    # ── Verdict ───────────────────────────────────────────────────────
    story.append(_verdict_block(certificate, styles))
    story.append(Spacer(1, 0.4 * cm))

    # ── Confidence + versions ─────────────────────────────────────────
    story.append(_meta_block(certificate, styles))
    story.append(Spacer(1, 0.6 * cm))

    # ── Argument graph table ──────────────────────────────────────────
    story.append(_section_heading("Argument Graph", styles))
    story.append(Spacer(1, 0.2 * cm))
    story.append(_graph_table(certificate))
    story.append(Spacer(1, 0.6 * cm))

    # ── Failure diagnosis (INVALID only) ─────────────────────────────
    if certificate.get("verdict") == "INVALID" and certificate.get("failure"):
        story.append(_section_heading("Failure Diagnosis", styles))
        story.append(Spacer(1, 0.2 * cm))
        story.append(_failure_block(certificate, styles))
        story.append(Spacer(1, 0.6 * cm))

    # ── Original reasoning (if retained) ─────────────────────────────
    if certificate.get("original_reasoning"):
        story.append(_section_heading("Original Reasoning Chain", styles))
        story.append(Spacer(1, 0.2 * cm))
        story.append(_reasoning_block(certificate, styles))
        story.append(Spacer(1, 0.6 * cm))

    # ── Footer ────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=_GREY))
    story.append(Spacer(1, 0.3 * cm))
    story.append(_footer_block(certificate, styles))

    doc.build(story)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------

def _header_block(cert: dict, styles: Any) -> Table:
    wordmark = Paragraph(
        "<b>PROVA</b>",
        ParagraphStyle(
            "wordmark",
            fontSize=20,
            textColor=_BLACK,
            fontName="Helvetica-Bold",
        ),
    )
    cert_id = Paragraph(
        f'<font name="Courier" size="11">{cert["certificate_id"]}</font>',
        ParagraphStyle("cert_id", alignment=2),  # right-align
    )
    timestamp = Paragraph(
        f'<font name="Courier" size="9" color="#6B7280">{_legal_timestamp(cert["timestamp"])}</font>',
        ParagraphStyle("timestamp", alignment=2),
    )
    right_col = [cert_id, Spacer(1, 0.15 * cm), timestamp]

    t = Table([[wordmark, right_col]], colWidths=["50%", "50%"])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def _verdict_block(cert: dict, styles: Any) -> Paragraph:
    verdict = cert["verdict"]
    colour = "#22C55E" if verdict == "VALID" else "#EF4444"
    label = "✓ VALID" if verdict == "VALID" else "✗ INVALID"
    return Paragraph(
        f'<font color="{colour}" size="28"><b>{label}</b></font>',
        ParagraphStyle("verdict", spaceAfter=4),
    )


def _meta_block(cert: dict, styles: Any) -> Paragraph:
    score = cert["confidence_score"]
    pv = cert["prova_version"]
    vv = cert["validator_version"]
    return Paragraph(
        f'<font size="10" color="#6B7280">'
        f'Confidence: {score}/100 &nbsp;&nbsp;|&nbsp;&nbsp; '
        f'Prova v{pv} &nbsp;&nbsp;|&nbsp;&nbsp; '
        f'Validator v{vv}'
        f'</font>',
        styles["Normal"],
    )


def _section_heading(title: str, styles: Any) -> Paragraph:
    return Paragraph(
        f"<b>{title}</b>",
        ParagraphStyle(
            "section_heading",
            fontSize=11,
            textColor=_BLACK,
            spaceAfter=2,
            fontName="Helvetica-Bold",
        ),
    )


def _graph_table(cert: dict) -> Table:
    graph = cert.get("argument_graph", {})
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    header = [
        Paragraph("<b>ID</b>", _mono_style(bold=True)),
        Paragraph("<b>Claim</b>", _mono_style(bold=True)),
        Paragraph("<b>Type</b>", _mono_style(bold=True)),
    ]
    rows = [header]

    for node in nodes:
        rows.append([
            Paragraph(f'<font name="Courier" size="8">{node["id"]}</font>', _mono_style()),
            Paragraph(f'<font size="8">{node.get("text", "")[:120]}</font>', _mono_style()),
            Paragraph(f'<font name="Courier" size="8">{node.get("type", "")}</font>', _mono_style()),
        ])

    # Add edge summary row
    if edges:
        edge_summary = ", ".join(f'{e["from"]}→{e["to"]}' for e in edges[:8])
        if len(edges) > 8:
            edge_summary += f" (+{len(edges) - 8} more)"
        rows.append([
            Paragraph('<font name="Courier" size="8">edges</font>', _mono_style()),
            Paragraph(f'<font name="Courier" size="8">{edge_summary}</font>', _mono_style()),
            Paragraph("", _mono_style()),
        ])

    t = Table(rows, colWidths=[2.5 * cm, 10.5 * cm, 2.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), _BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), _WHITE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_WHITE, _LIGHT_GREY]),
        ("GRID", (0, 0), (-1, -1), 0.25, _GREY),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def _failure_block(cert: dict, styles: Any) -> Table:
    failure = cert["failure"]
    ftype = failure.get("type", "")
    colour = "#EF4444"

    rows = [
        [
            Paragraph("<b>Type</b>", _label_style()),
            Paragraph(
                f'<font color="{colour}"><b>{ftype}</b></font>',
                styles["Normal"],
            ),
        ],
        [
            Paragraph("<b>Location</b>", _label_style()),
            Paragraph(failure.get("location", ""), styles["Normal"]),
        ],
        [
            Paragraph("<b>Description</b>", _label_style()),
            Paragraph(failure.get("description", ""), styles["Normal"]),
        ],
    ]

    consequence = failure.get("known_consequence")
    if consequence:
        rows.append([
            Paragraph("<b>Known consequence</b>", _label_style()),
            Paragraph(
                f'<b>{consequence["name"]}</b> ({consequence["severity"]}): '
                f'{consequence["consequence"]}',
                styles["Normal"],
            ),
        ])

    t = Table(rows, colWidths=[3.5 * cm, 12 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.25, _LIGHT_GREY),
    ]))
    return t


def _reasoning_block(cert: dict, styles: Any) -> Paragraph:
    text = cert["original_reasoning"] or ""
    # Truncate very long chains in the PDF — full text is on the web page
    if len(text) > 2000:
        text = text[:2000] + "\n\n[truncated — full reasoning available at certificate URL]"
    escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(
        f'<font name="Courier" size="8">{escaped}</font>',
        ParagraphStyle(
            "reasoning",
            leftIndent=0.5 * cm,
            backColor=_LIGHT_GREY,
            borderPad=6,
            leading=12,
        ),
    )


def _footer_block(cert: dict, styles: Any) -> Table:
    url_line = Paragraph(
        f'<font name="Courier" size="8">{cert.get("certificate_url", "")}</font>',
        styles["Normal"],
    )
    hash_line = Paragraph(
        f'<font name="Courier" size="7" color="#6B7280">SHA-256: {cert["sha256"]}</font>',
        styles["Normal"],
    )
    disclaimer = Paragraph(
        '<font size="7" color="#6B7280"><i>'
        "This certificate verifies logical structure only. It does not verify "
        "factual accuracy, ethical appropriateness, regulatory compliance, or "
        "fitness for purpose. A structurally valid argument may still reach "
        "incorrect conclusions from false premises."
        "</i></font>",
        styles["Normal"],
    )
    t = Table([[url_line], [hash_line], [Spacer(1, 0.2 * cm)], [disclaimer]])
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


# ---------------------------------------------------------------------------
# Style helpers
# ---------------------------------------------------------------------------

def _mono_style(bold: bool = False) -> ParagraphStyle:
    return ParagraphStyle(
        "mono",
        fontName="Courier-Bold" if bold else "Courier",
        fontSize=8,
        leading=10,
    )


def _label_style() -> ParagraphStyle:
    return ParagraphStyle(
        "label",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=_GREY,
    )


def _legal_timestamp(iso: str) -> str:
    """Convert ISO timestamp to legal format: '27 March 2026 at 14:32:01 UTC'."""
    from datetime import datetime, UTC
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ]
        return f"{dt.day} {months[dt.month - 1]} {dt.year} at {dt.strftime('%H:%M:%S')} UTC"
    except Exception:
        return iso
