# ============================================================
# INSTRUCTIONS: Create these 6 files exactly as shown below.
# Each section shows the file path and its complete contents.
# ============================================================


# ── FILE: prova/__init__.py ──────────────────────────────────
"""
prova — Formally verified reasoning validator for AI.

Mathematical foundation: H¹(K;ℤ) = 0 ⟺ argument is structurally valid.
Backed by 2,400+ formally verified Lean 4 theorems via cobound-validator.
"""

from prova.certificate.versioning import PROVA_VERSION

__version__ = PROVA_VERSION
__all__ = ["__version__"]


# ── FILE: prova/extraction/__init__.py ──────────────────────
# (empty — marks as Python package)


# ── FILE: prova/reasoning_failures/__init__.py ──────────────
# (empty — marks as Python package)


# ── FILE: prova/analysis/__init__.py ────────────────────────
# (empty — marks as Python package)


# ── FILE: prova/certificate/__init__.py ─────────────────────
# (empty — marks as Python package)


# ── FILE: prova/api/__init__.py ──────────────────────────────
# (empty — marks as Python package)


# ── FILE: prova/storage/__init__.py ─────────────────────────
# (empty — marks as Python package)
