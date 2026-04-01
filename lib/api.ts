"""
prova/certificate/versioning.py

Dual version tracking for Prova certificates.

Every certificate records both:
  - prova_version:     the version of Prova that generated it
  - validator_version: the version of cobound-validator used for analysis

This allows legal and compliance traceability: a certificate's mathematical
guarantee is tied to the specific version of the formal proof engine used,
not just the version of the product wrapper.
"""

from __future__ import annotations

import importlib.metadata


# Prova version — updated on every release
PROVA_VERSION = "1.0.0"


def get_validator_version() -> str:
    """Return the installed version of cobound-validator.

    Falls back to "unknown" if the package is not installed via pip
    (e.g. in development from source).

    Returns:
        Version string such as "0.1.0".
    """
    try:
        return importlib.metadata.version("cobound-validator")
    except importlib.metadata.PackageNotFoundError:
        return "unknown"


def get_versions() -> dict[str, str]:
    """Return both version strings as a dict.

    Returns:
        {"prova": "1.0.0", "validator": "0.1.0"}
    """
    return {
        "prova": PROVA_VERSION,
        "validator": get_validator_version(),
    }
