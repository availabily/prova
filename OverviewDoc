# Prova Design Specification
## Version 1.0.0 — Pre-Build Reference Document
### Last Updated: March 2026

---

## 0. What This Document Is

This is the single source of truth for building Prova. Every architectural decision, interface contract, schema definition, and design choice made during the planning phase is recorded here. Any coding agent working on any part of Prova should be given this document as context. Nothing in this document should be re-decided without updating this document first.

---

## 1. Product Definition

**Prova** is a reasoning validity engine. It takes any AI chain-of-thought reasoning output and produces a formal certificate of logical validity — or a precise diagnosis of exactly where the reasoning breaks down.

**What it is NOT:**
- A fact-checker (does not verify factual accuracy)
- A bias detector
- A performance monitor
- An output filter or content moderator

**What it IS:**
- The first tool that checks whether an AI argument structure is logically sound, independent of factual content
- A formally grounded product built on top of 2,400+ Lean 4 verified theorems (cobound-validator)
- A compliance instrument for EU AI Act, FDA AI guidance, and SEC algorithmic trading audit requirements

**Core value proposition (VC-facing):**
Prova is the first tool that doesn't just log what your AI decided — it proves the reasoning was sound.

**Core feeling priority (in order):**
1. Powerful — this tool does something nothing else does
2. Certain — the verdict is definitive, not probabilistic
3. Informed — the user understands exactly what happened
4. Protected — they are covered from a compliance standpoint

---

## 2. Architecture

### 2.1 Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend / Web | Vercel + React + TypeScript + Tailwind | Consistent with existing Cobound stack |
| Database | Supabase | Already in use for Mirror; RLS-enabled; EU region available |
| Backend Analysis Engine | Railway (Python service) | No execution time limits; Python-native for cobound-validator |
| Extraction AI | Anthropic Claude API (claude-sonnet-4-6) | Best structured reasoning extraction; already in ecosystem |
| Math Engine | cobound-validator (PyPI) | Imported as dependency; zero modification needed |
| Monitoring | Uptime Robot (API pings) + Sentry (error logging) | Free tier sufficient for launch |
| Status page | status.prova.cobound.dev | Operational maturity signal for enterprise |

### 2.2 Request Flow

```
User / API caller
      ↓
POST api.prova.cobound.dev/verify   [Vercel edge function]
      ↓
Railway Python service (prova-engine)
      ↓ (1) Claude API: extract argument graph from reasoning text
      ↓ (2) cobound-validator: run AgentNetwork analysis on graph
      ↓ (3) reasoning_failures registry: map failure type to downstream consequences
      ↓ (4) Certificate generated with dual version tags
      ↓
Supabase: certificate stored (or not, if retain=false)
      ↓
JSON certificate returned to caller
      ↓
Vercel: certificate page rendered at prova.cobound.dev/certificate/[ID]
```

### 2.3 Package Relationship

```
prova (PyPI package, new)
  └── imports cobound-validator (PyPI, existing, zero modifications)
        └── core math: AgentNetwork, is_forest(), find_cycles(), validate()
```

Prova adds on top of cobound-validator:
- `extraction/` — Claude API call, prompt, JSON output parsing
- `reasoning_failures/` — failure type to downstream consequence registry
- `certificate/` — certificate generation, versioning, hashing
- `api/` — FastAPI or Flask endpoint handler
- `cli/` — command-line interface (mirrors cobound-validator CLI pattern)

---

## 3. API Contract

### 3.1 Endpoint

```
POST https://api.prova.cobound.dev/verify
Authorization: Bearer <api_key>   [omit for free tier with public demo key]
Content-Type: application/json
```

### 3.2 Request Body

```json
{
  "reasoning": "Step 1: X is true because Y. Step 2: Given X, Z follows. Step 3: Therefore W.",
  "format": "auto",
  "retain": true,
  "metadata": {
    "model": "claude-sonnet-4-6",
    "pipeline": "customer-support-escalation",
    "decision_id": "dec-20260327-abc123"
  }
}
```

**Fields:**
- `reasoning` (string, required) — The AI reasoning chain to verify. Plain text.
- `format` (string, optional, default `"auto"`) — `"structured"` for numbered steps, `"prose"` for flowing text, `"auto"` for Claude to determine.
- `retain` (boolean, optional, default `true`) — If `false`, reasoning text is not stored. Certificate metadata only is stored.
- `metadata` (object, optional) — Arbitrary key-value pairs attached to and returned with the certificate. Never used by the analysis engine.

### 3.3 Response Body (VALID example)

```json
{
  "certificate_id": "PRV-2026-A7X4",
  "timestamp": "2026-03-27T14:32:01Z",
  "verdict": "VALID",
  "confidence_score": 97,
  "prova_version": "1.0.0",
  "validator_version": "0.1.0",
  "argument_graph": {
    "nodes": [
      {"id": "claim-1", "text": "Y is established", "type": "premise"},
      {"id": "claim-2", "text": "X is true because Y", "type": "claim"},
      {"id": "claim-3", "text": "Z follows from X", "type": "claim"},
      {"id": "claim-4", "text": "Therefore W", "type": "conclusion"}
    ],
    "edges": [
      {"from": "claim-1", "to": "claim-2"},
      {"from": "claim-2", "to": "claim-3"},
      {"from": "claim-3", "to": "claim-4"}
    ]
  },
  "failure": null,
  "original_reasoning": "Step 1: X is true because Y...",
  "metadata": {
    "model": "claude-sonnet-4-6",
    "pipeline": "customer-support-escalation",
    "decision_id": "dec-20260327-abc123"
  },
  "certificate_url": "https://prova.cobound.dev/certificate/PRV-2026-A7X4",
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

### 3.4 Response Body (INVALID example)

```json
{
  "certificate_id": "PRV-2026-B2M9",
  "timestamp": "2026-03-27T14:35:22Z",
  "verdict": "INVALID",
  "confidence_score": 0,
  "prova_version": "1.0.0",
  "validator_version": "0.1.0",
  "argument_graph": {
    "nodes": [...],
    "edges": [...]
  },
  "failure": {
    "type": "CIRCULAR",
    "failure_id": "CIRC-001",
    "location": "Step 4",
    "description": "Step 4 claims to follow from Steps 1 and 2, but introduces the conclusion as a premise. The conclusion (W) is used to establish claim-3, which is required to reach W. This is circular reasoning.",
    "affected_nodes": ["claim-3", "claim-4"],
    "affected_edges": [{"from": "claim-4", "to": "claim-3"}],
    "known_consequence": {
      "name": "Diagnostic Anchoring",
      "consequence": "AI reinforces initial hypothesis by treating unverified conclusion as established premise",
      "severity": "critical"
    }
  },
  "original_reasoning": "...",
  "metadata": {},
  "certificate_url": "https://prova.cobound.dev/certificate/PRV-2026-B2M9",
  "sha256": "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a"
}
```

### 3.5 Error Responses

```json
{ "error": "INPUT_TOO_SHORT", "message": "Reasoning chain must contain at least two distinct claims." }
{ "error": "NO_STRUCTURE_DETECTED", "message": "Prova could not identify a logical dependency structure. Submit argumentative reasoning, not descriptive text." }
{ "error": "INPUT_TOO_LONG", "message": "Reasoning chain exceeds 8,000 tokens. Submit in sections for analysis." }
{ "error": "EXTRACTION_AMBIGUOUS", "message": "Multiple valid dependency structures detected. Confidence below threshold.", "confidence_score": 43 }
{ "error": "UNAUTHORIZED", "message": "Invalid or missing API key." }
{ "error": "RATE_LIMITED", "message": "Free tier limit reached. Upgrade at prova.cobound.dev/pricing." }
```

---

## 4. Supabase Database Schema

### 4.1 Tables

```sql
-- Certificates
CREATE TABLE certificates (
  id TEXT PRIMARY KEY,                          -- e.g. "PRV-2026-A7X4"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verdict TEXT NOT NULL CHECK (verdict IN ('VALID', 'INVALID')),
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  prova_version TEXT NOT NULL,                  -- e.g. "1.0.0"
  validator_version TEXT NOT NULL,              -- e.g. "0.1.0"
  argument_graph JSONB NOT NULL,               -- full graph with nodes and edges
  failure JSONB,                               -- null if VALID
  original_reasoning TEXT,                     -- null if retain=false
  metadata JSONB DEFAULT '{}',
  sha256 TEXT NOT NULL,
  user_id UUID REFERENCES users(id),           -- null for unauthenticated free tier
  api_key_id UUID REFERENCES api_keys(id)
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'team', 'enterprise')),
  stripe_customer_id TEXT
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,               -- SHA-256 of actual key; never store raw key
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Usage Tracking
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verdict TEXT,
  failure_type TEXT,                           -- CIRCULAR / CONTRADICTION / UNSUPPORTED_LEAP / null
  reasoning_length_tokens INTEGER,            -- length only, never content
  format TEXT,
  retain BOOLEAN
);
```

### 4.2 RLS Policies

- `certificates`: users can SELECT their own certificates; all authenticated users can INSERT; no DELETE ever
- `users`: users can SELECT and UPDATE their own row only
- `api_keys`: users can SELECT, INSERT, UPDATE (deactivate) their own keys only
- `usage`: users can SELECT their own usage; INSERT from service role only

---

## 5. Certificate Design

### 5.1 Certificate ID Format

`PRV-YYYY-XXXX` where YYYY is year and XXXX is first 4 characters of SHA-256 hex (uppercase). Example: `PRV-2026-A7X4`.

Human-readable. Scannable. Looks like a real credential. Referenceable in email without copy-paste.

### 5.2 SHA-256 Hash

Computed over: `certificate_id + timestamp + verdict + confidence_score + JSON.stringify(argument_graph) + (failure ? JSON.stringify(failure) : "null")`. Does NOT include `original_reasoning` (may be absent) or `metadata` (mutable context). Allows independent verification that the analytical result hasn't been tampered with.

### 5.3 Permanence Rules

- Certificates are NEVER deleted.
- If a certificate is disputed and a correction is issued, the original is marked `superseded: true` and linked to the correction certificate. Both remain permanently accessible.
- `retain: false` requests store everything except `original_reasoning`. The certificate is still valid and permanent.

### 5.4 Dual Versioning

Every certificate records both `prova_version` and `validator_version`. This allows:
- Legal traceability: which version of Prova certified this reasoning
- Mathematical traceability: which version of the formal proof engine was used
- Audit completeness: re-running the same reasoning on a newer version can show how certification evolves

---

## 6. Reasoning Failures Registry

File: `prova/reasoning_failures/registry.py`

### 6.1 Failure Types

Three types, mapped directly from cobound-validator's analysis output:
- `CIRCULAR` — from `find_cycles()` returning non-empty result (H¹ ≠ 0)
- `CONTRADICTION` — from structural contradiction in dependency graph
- `UNSUPPORTED_LEAP` — from coboundary analysis finding open chains (delta residue non-zero)

### 6.2 Registry Contents

```python
REASONING_FAILURES = {
    "CIRCULAR": [
        {
            "id": "CIRC-001",
            "domain": "medical",
            "name": "Diagnostic Anchoring",
            "consequence": "AI reinforces initial hypothesis by treating unverified conclusion as established premise, ignoring contradicting evidence",
            "severity": "critical"
        },
        {
            "id": "CIRC-002",
            "domain": "legal",
            "name": "False Precedent Circularity",
            "consequence": "AI cites a conclusion as established law when that law was itself derived from the conclusion being argued",
            "severity": "critical"
        },
        {
            "id": "CIRC-003",
            "domain": "financial",
            "name": "Risk Tautology",
            "consequence": "Risk assessment references its own output as an input to justify confidence score",
            "severity": "high"
        },
        {
            "id": "CIRC-004",
            "domain": "general",
            "name": "Goal Drift Justification",
            "consequence": "Agent justifies pursuing a subgoal by appealing to achieving the main goal, which itself depends on the subgoal",
            "severity": "high"
        }
    ],
    "CONTRADICTION": [
        {
            "id": "CONT-001",
            "domain": "medical",
            "name": "Inconsistent Treatment Recommendation",
            "consequence": "Two valid premises simultaneously produce contradictory action directives",
            "severity": "critical"
        },
        {
            "id": "CONT-002",
            "domain": "legal",
            "name": "Opposing Clause Activation",
            "consequence": "Analysis simultaneously triggers mutually exclusive contractual obligations",
            "severity": "critical"
        },
        {
            "id": "CONT-003",
            "domain": "financial",
            "name": "Conflicting Position Signals",
            "consequence": "System simultaneously recommends opposing actions on the same instrument",
            "severity": "critical"
        },
        {
            "id": "CONT-004",
            "domain": "general",
            "name": "Inconsistent World State",
            "consequence": "Contradictory ground truth premises produce coordination failure from the first downstream inference",
            "severity": "high"
        }
    ],
    "UNSUPPORTED_LEAP": [
        {
            "id": "LEAP-001",
            "domain": "medical",
            "name": "Ungrounded Severity Escalation",
            "consequence": "AI jumps from symptom observation to high-risk diagnosis without intermediate clinical reasoning",
            "severity": "critical"
        },
        {
            "id": "LEAP-002",
            "domain": "legal",
            "name": "Unsupported Liability Attribution",
            "consequence": "Conclusion assigns fault without a reasoning chain connecting evidence to the applicable legal standard",
            "severity": "high"
        },
        {
            "id": "LEAP-003",
            "domain": "financial",
            "name": "Unjustified Confidence",
            "consequence": "Model states high-confidence prediction with a reasoning chain that does not structurally support that confidence level",
            "severity": "high"
        },
        {
            "id": "LEAP-004",
            "domain": "code",
            "name": "Security Misclassification",
            "consequence": "Vulnerability flagged as critical without a reasoning chain from the observation to the severity criteria",
            "severity": "high"
        }
    ]
}

def map_failure(failure_type: str, domain: str = None) -> list:
    failures = REASONING_FAILURES.get(failure_type, [])
    if domain:
        failures = [f for f in failures if f["domain"] == domain or f["domain"] == "general"]
    return failures

def get_most_severe(failure_type: str, domain: str = None) -> dict | None:
    failures = map_failure(failure_type, domain)
    severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    if not failures:
        return None
    return min(failures, key=lambda f: severity_rank.get(f["severity"], 99))
```

---

## 7. Extraction Layer

### 7.1 What It Does

Converts natural language reasoning text into a structured JSON graph matching `AgentNetwork.from_dict()` input format:

```json
{
  "agents": [{"id": "claim-1"}, {"id": "claim-2"}, ...],
  "edges": [{"from": "claim-1", "to": "claim-2"}, ...]
}
```

Node IDs are short slugs (`claim-1`, `claim-2`, etc.). Claim text is stored separately in a parallel `node_labels` dict for certificate display.

### 7.2 Extraction Prompt (v1.0)

The extraction prompt instructs Claude to:
1. Identify every distinct claim (premise, intermediate claim, conclusion)
2. For each claim, identify which prior claims it depends on
3. Return ONLY a JSON object — no preamble, no explanation
4. If structure is ambiguous, return the most likely interpretation and flag `ambiguous: true`
5. Explicitly handle five input types: numbered steps, prose, multi-branch (if/else), nested, and implicit-premise

Full prompt text stored in `prova/extraction/prompt_v1.txt`. Version-tracked alongside Prova version.

### 7.3 Extraction Quality Gate

Before any certificate is issued, extraction confidence must exceed 70%. Calculated as: Claude's self-reported certainty if available, else heuristic based on graph structure completeness (all nodes reachable from at least one premise, exactly one terminal node, no isolated nodes).

If confidence < 70%: return `EXTRACTION_AMBIGUOUS` error with the confidence score. Do not issue a certificate.

---

## 8. Web Interface — Three Screens

### 8.1 Screen 1: Verifier (prova.cobound.dev)

**Elements (top to bottom):**
- Prova wordmark (top left) + nav link to Docs + Sign In (top right)
- Headline: "Does your AI reason correctly?"
- Subhead: "Paste any AI reasoning chain. Get a formal certificate in seconds."
- Large textarea: "Paste reasoning chain here..." (placeholder)
- Single button: "Verify"
- Below the fold: two sample certificates side by side — one VALID, one INVALID. These are real certificates generated during development, not mockups.
- Footer: link to API docs, pricing, GitHub

**No account required to verify on free tier.**

### 8.2 Screen 2: Certificate Page (prova.cobound.dev/certificate/[ID])

**Layout:**
- Header block: Certificate ID (monospace) + Timestamp (full ISO format)
- Verdict in large type: VALID (green) or INVALID (red)
- Confidence score: "97% structurally sound"
- Prova version + validator version (small, below confidence)
- Interactive argument graph (D3, rendered client-side from graph JSON)
  - Green nodes/edges: valid
  - Red nodes/edges: involved in failure (INVALID only)
  - Hoverable: shows claim text on hover
- Original reasoning chain (monospace, collapsible, line-numbered)
- Failure block (INVALID only):
  - Failure type badge: CIRCULAR / CONTRADICTION / UNSUPPORTED_LEAP
  - Plain English description
  - Affected step highlighted in the reasoning chain above
  - Known consequence block (from registry)
- Disclaimer (always visible, not in footer): "This certificate verifies logical structure only. It does not verify factual accuracy, ethical appropriateness, regulatory compliance, or fitness for purpose."
- Export button: "Download PDF Certificate"
- Share button: copies certificate URL to clipboard

### 8.3 Screen 3: Dashboard (prova.cobound.dev/dashboard — authenticated only)

**Elements:**
- Summary stats: total verifications, valid %, invalid % this month
- Filterable table: all certificates, sortable by date / verdict / failure type
- One-click PDF export for any certificate
- "Export compliance package" button — downloads all certificates for the current billing period as a ZIP of PDFs
- API key management: create, label, deactivate keys
- Usage meter: current month vs plan limit

---

## 9. PDF Certificate Design

Generated server-side at certificate creation time. Stored as a file reference in Supabase. Identical on every download — not regenerated from HTML.

**Contents:**
- Header: Prova wordmark (left) + Certificate ID in monospace (right)
- Timestamp in full legal format: "27 March 2026 at 14:32:01 UTC"
- Verdict in large type
- Confidence score
- Static argument graph image (PNG, generated server-side with matplotlib or equivalent)
- Original reasoning chain in monospace font block (omitted if `retain: false`)
- Failure diagnosis block (INVALID only)
- Footer: Certificate URL + SHA-256 hash for independent verification
- Disclaimer: scope of certification

**Library:** `reportlab` or `weasyprint` on Railway. Decision to be made during Coding Agent Prompt 3.

---

## 10. Versioning Strategy

### 10.1 Prova Versions

Semantic versioning: `MAJOR.MINOR.PATCH`
- MAJOR: breaking API change or fundamental analysis methodology change
- MINOR: new features, new failure registry entries, extraction prompt improvements
- PATCH: bug fixes, performance improvements

Launch version: `1.0.0`

### 10.2 Extraction Prompt Versioning

The extraction prompt is versioned independently as `prompt_v1.txt`, `prompt_v2.txt`, etc. The prompt version used for each certificate is recorded in Supabase (add `extraction_prompt_version TEXT` column to `certificates` table).

### 10.3 Backward Compatibility

All certificates are valid forever under the version that generated them. Prova never retroactively re-analyzes existing certificates when the analysis engine changes. A new analysis of the same reasoning under a new version produces a new certificate — the old one is not superseded unless the owner explicitly requests re-analysis.

---

## 11. Rate Limiting

| Tier | Monthly limit | Burst limit | Overage |
|---|---|---|---|
| Free (no auth) | 500 req | 10/min | Hard block |
| Free (authenticated) | 500 req | 10/min | Hard block |
| Team ($499/mo) | 10,000 req | 60/min | $0.05/req |
| Enterprise | Custom | Custom | Negotiated |

Tracked per `api_key_id`. Free tier unauthenticated requests tracked per IP. Every request logs: timestamp, key/IP, reasoning token length (not content), verdict.

---

## 12. Legal and Compliance Design

### 12.1 Terms of Service — Required Clauses

- Prova does not train models on submitted reasoning chains
- Prova does not share submitted reasoning chains with third parties
- Reasoning chains are processed solely for the purpose of structural analysis
- `retain: false` requests are processed in memory; reasoning text is never written to disk or database

### 12.2 Certificate Disclaimer (on every certificate, in product, not just ToS)

"This certificate verifies logical structure only. It does not verify factual accuracy, ethical appropriateness, regulatory compliance, or fitness for purpose. A structurally valid argument may still reach incorrect conclusions from false premises."

### 12.3 EU Data Residency

Launch: US region (Supabase default). Architecture supports EU region switch — Supabase `dlzbezokyovfjzedsotf` pattern used for Mirror is replicated. EU region activation is a V2 enterprise feature, not a launch requirement. Add to sales FAQ: "EU data residency available on Enterprise plan."

### 12.4 SOC 2 Readiness

All access is logged. All API keys are hashed before storage. No raw credentials in database. Certificates are immutable post-creation. Audit trail design is SOC 2 Type II-compatible from day one. "SOC 2 in progress" is a truthful statement at launch.

---

## 13. Monitoring Stack

| Tool | Purpose | Setup |
|---|---|---|
| Uptime Robot | Ping `api.prova.cobound.dev/health` every 60s | Free tier, 5 min setup |
| Sentry | Error logging from Railway service | Free tier, one DSN |
| status.prova.cobound.dev | Public status page | Betteruptime free or self-hosted |

Health endpoint: `GET /health` returns `{"status": "ok", "version": "1.0.0", "validator_version": "0.1.0"}`.

---

## 14. Brand and URLs

| URL | Purpose |
|---|---|
| prova.cobound.dev | Main web interface |
| api.prova.cobound.dev | API endpoint |
| status.prova.cobound.dev | Status page |
| prova.dev | Registered, pointed at prova.cobound.dev |

**Visual language:**
- Near-black background (#0A0A0A) for certificate pages
- VALID accent: precise green (#22C55E — Tailwind green-500)
- INVALID accent: precise red (#EF4444 — Tailwind red-500)
- Typography: monospace (JetBrains Mono) for IDs, timestamps, reasoning chains; clean sans-serif (Geist or DM Sans) for verdicts and prose
- No gradients. No decorative elements. Restraint is the message.
- Certificate pages feel like a passport, a legal document, a diploma — authoritative, final

---

## 15. Launch Sequence

**Week 1-2: API + Railway backend**
- Coding Agent Prompt 1: Railway Python service (extraction, analysis, certificate generation)
- Coding Agent Prompt 2: Supabase schema (all tables, RLS)
- Private beta: 5 developers, real reasoning chains, refine extraction prompt

**Week 3: Web interface**
- Coding Agent Prompt 3: Vercel frontend (three screens, D3 visualization, PDF export)
- Sample certificates from private beta go live on homepage

**Week 4: Package + docs**
- Coding Agent Prompt 4: `prova` PyPI package with CLI
- Documentation: quickstart, API reference, certificate guide, integration examples, data/privacy

**Week 5-8: Compliance push**
- LinkedIn post goes live with EU AI Act deadline framing
- Email to MAST paper authors with live product link (arXiv endorsement unlock)
- Three enterprise compliance team conversations
- Target: one pilot customer before August 2026

---

## 16. Cold Start Solution

Before launch, generate 10 real certificates from publicly available AI reasoning chains:
- Published chain-of-thought examples from major AI labs
- Open source agent framework decision logs
- Public AI research paper reasoning sections

Select the 3 most interesting VALID and 3 most interesting INVALID results. These become:
- Sample certificates on prova.cobound.dev homepage
- Examples in API documentation
- Demo artifacts for sales conversations

These are real certificates, not mockups. They demonstrate the product on real AI outputs.

---

## 17. What Prova Does NOT Build in V1

- Batch processing (V2 enterprise feature)
- Native Claude/ChatGPT plugins (V2 distribution)
- Custom certificate branding / white-labeling (V2 enterprise)
- Repair suggestions (V2 — requires additional math)
- EU data residency (V2 enterprise)
- Argument strength gradients / partial validity scoring (V2 — additional theorem development)
- Multi-language reasoning chain support (V2)

---

## 18. Open Questions (Resolved at Build Time)

- PDF generation library: `reportlab` vs `weasyprint` — decide during Coding Agent Prompt 3 based on Railway compatibility
- Extraction prompt final text: finalized during private beta, not before
- D3 vs alternative for graph visualization: D3 preferred; fallback to Cytoscape.js if D3 proves too complex for the certificate page use case

---

*End of Prova Design Specification v1.0.0*
*Next step: Coding Agent Prompt 1 — Railway Analysis Engine*
