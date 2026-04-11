# Prova -- Formally Verified AI Reasoning Certificates

## What This Is
Reasoning validity engine. Takes AI chain-of-thought, produces formal certificate of logical validity.
Built on cobound-validator (PyPI). Mathematical foundation: H1(K;Z) = 0 iff argument structurally valid.

## Architecture
- Frontend: Next.js 14 + Tailwind + D3 on Vercel (prova.cobound.dev)
- Backend: FastAPI on Render (api.prova.cobound.dev)
- Database: Supabase (certificates, users, api_keys, usage tables)
- Extraction: Anthropic Claude API (claude-sonnet-4-6)
- Math engine: cobound-validator (PyPI, zero modifications)

## Key Design Decisions
- Prova ignores mast_failures from validator; uses own reasoning_failures registry
- Three failure types: CIRCULAR, CONTRADICTION, UNSUPPORTED_LEAP
- Certificates are NEVER deleted
- retain=false means reasoning text never written to disk
- Certificate ID format: PRV-YYYY-XXXX (first 4 chars of SHA-256)
- Dual versioning: prova_version + validator_version on every certificate

## File Structure
- prova/api/ -- FastAPI endpoints (main.py, auth.py, errors.py, models.py)
- prova/extraction/ -- Claude API extraction (extractor.py, prompt_v1.txt, validator.py)
- prova/analysis/ -- cobound-validator integration (analyzer.py, graph_builder.py)
- prova/certificate/ -- generation + versioning (generator.py, versioning.py)
- prova/reasoning_failures/ -- failure registry (registry.py)
- prova/storage/ -- Supabase client + PDF generation (client.py, pdf.py)
- prova/cli.py -- CLI entry point
- app/ -- Next.js frontend pages
- components/ -- React components (ArgumentGraph, VerdictBadge, etc.)
- migrations/ -- Supabase SQL migrations (001-004)

## Constraints
- No em dashes in any text output
- Zero axioms beyond Mathlib for formal verification
- All Lean 4 proofs target Mathlib 4.26.0+
- Python 3.10+ required
- Supabase service role key for backend writes
