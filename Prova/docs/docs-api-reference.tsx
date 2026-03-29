/**
 * app/docs/api-reference/page.tsx — API Reference
 */

import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'API Reference — Prova Docs' }

export default function ApiReferencePage() {
  return (
    <article className="space-y-10">
      <div className="space-y-3">
        <p className="mono text-xs text-muted tracking-widest uppercase">API Reference</p>
        <h1 className="text-3xl font-bold text-text">API Reference</h1>
        <p className="text-dim leading-relaxed mono text-xs">
          Base URL: <span className="text-text">https://api.prova.cobound.dev</span>
          <br />
          Authentication: <span className="text-text">Authorization: Bearer {'<api_key>'}</span>
          <br />
          Content-Type: <span className="text-text">application/json</span>
        </p>
      </div>

      {/* POST /verify */}
      <EndpointBlock
        method="POST"
        path="/verify"
        description="Analyze a reasoning chain and return a formal validity certificate."
      >
        <FieldTable title="Request body" fields={[
          { name: 'reasoning',  type: 'string',  required: true,  desc: 'The reasoning chain to analyze. 20–32,000 characters.' },
          { name: 'format',     type: 'string',  required: false, desc: '"auto" | "structured" | "prose". Default: "auto".' },
          { name: 'retain',     type: 'boolean', required: false, desc: 'Store reasoning text with certificate. Default: true.' },
          { name: 'metadata',   type: 'object',  required: false, desc: 'Arbitrary key-value pairs attached to the certificate.' },
        ]} />

        <FieldTable title="Response (200 OK)" fields={[
          { name: 'certificate_id',             type: 'string',  required: true,  desc: 'PRV-YYYY-XXXX format. Unique, permanent.' },
          { name: 'timestamp',                  type: 'string',  required: true,  desc: 'ISO 8601 UTC timestamp of certificate generation.' },
          { name: 'verdict',                    type: 'string',  required: true,  desc: '"VALID" or "INVALID".' },
          { name: 'confidence_score',           type: 'integer', required: true,  desc: '0–100. Extraction quality score.' },
          { name: 'prova_version',              type: 'string',  required: true,  desc: 'Prova version that generated this certificate.' },
          { name: 'validator_version',          type: 'string',  required: true,  desc: 'cobound-validator version used for analysis.' },
          { name: 'extraction_prompt_version',  type: 'string',  required: true,  desc: 'Extraction prompt version (e.g. "v1").' },
          { name: 'argument_graph',             type: 'object',  required: true,  desc: '{ nodes: [...], edges: [...] }. See Certificate Guide.' },
          { name: 'failure',                    type: 'object',  required: true,  desc: 'Failure detail object, or null if VALID.' },
          { name: 'original_reasoning',         type: 'string',  required: false, desc: 'Original reasoning text, or null if retain=false.' },
          { name: 'metadata',                   type: 'object',  required: true,  desc: 'Caller-provided metadata, echoed back.' },
          { name: 'certificate_url',            type: 'string',  required: true,  desc: 'Permanent public URL for this certificate.' },
          { name: 'sha256',                     type: 'string',  required: true,  desc: 'SHA-256 hash for independent verification.' },
        ]} />

        <FieldTable title="failure object (when verdict=INVALID)" fields={[
          { name: 'type',             type: 'string', required: true,  desc: '"CIRCULAR" | "CONTRADICTION" | "UNSUPPORTED_LEAP".' },
          { name: 'failure_id',       type: 'string', required: false, desc: 'Registry entry ID (e.g. "CIRC-001").' },
          { name: 'location',         type: 'string', required: true,  desc: 'Plain English description of where failure occurs.' },
          { name: 'description',      type: 'string', required: true,  desc: 'Full failure description.' },
          { name: 'affected_nodes',   type: 'array',  required: true,  desc: 'Node IDs involved in the failure.' },
          { name: 'affected_edges',   type: 'array',  required: true,  desc: 'Edge pairs {from, to} involved in the failure.' },
          { name: 'known_consequence',type: 'object', required: false, desc: 'Known downstream consequence from the registry.' },
        ]} />
      </EndpointBlock>

      {/* GET /certificate/:id */}
      <EndpointBlock
        method="GET"
        path="/certificate/{id}"
        description="Retrieve a stored certificate by ID. Public — no authentication required."
      >
        <FieldTable title="Path parameters" fields={[
          { name: 'id', type: 'string', required: true, desc: 'Certificate ID in PRV-YYYY-XXXX format.' },
        ]} />
        <p className="mono text-xs text-dim leading-relaxed">
          Returns the same schema as POST /verify. Returns 404 if the certificate does not exist.
          Certificates are permanent — they are never deleted.
        </p>
      </EndpointBlock>

      {/* GET /health */}
      <EndpointBlock
        method="GET"
        path="/health"
        description="Health check. Returns current version information."
      >
        <FieldTable title="Response (200 OK)" fields={[
          { name: 'status',            type: 'string', required: true, desc: '"ok"' },
          { name: 'version',           type: 'string', required: true, desc: 'Prova version.' },
          { name: 'validator_version', type: 'string', required: true, desc: 'cobound-validator version.' },
        ]} />
      </EndpointBlock>

      {/* Error codes */}
      <section className="space-y-4">
        <h2 className="mono text-sm font-semibold text-text border-b border-border pb-2">Error codes</h2>
        <div className="border border-border divide-y divide-border">
          {[
            { code: 'INPUT_TOO_SHORT',       status: '422', desc: 'Reasoning chain is fewer than 20 characters.' },
            { code: 'INPUT_TOO_LONG',         status: '422', desc: 'Reasoning chain exceeds 32,000 characters.' },
            { code: 'NO_STRUCTURE_DETECTED',  status: '422', desc: 'No logical dependency structure found in input.' },
            { code: 'EXTRACTION_AMBIGUOUS',   status: '422', desc: 'Multiple possible structures, confidence below threshold.' },
            { code: 'EXTRACTION_FAILED',      status: '500', desc: 'Internal extraction error.' },
            { code: 'ANALYSIS_FAILED',        status: '500', desc: 'Internal analysis error.' },
            { code: 'CERTIFICATE_NOT_FOUND',  status: '404', desc: 'No certificate found with the given ID.' },
            { code: 'UNAUTHORIZED',           status: '401', desc: 'Invalid or missing API key.' },
            { code: 'RATE_LIMITED',           status: '429', desc: 'Monthly or burst rate limit reached.' },
            { code: 'DEMO_LIMIT_REACHED',     status: '429', desc: 'Demo key IP limit reached (10 requests).' },
          ].map((e) => (
            <div key={e.code} className="grid grid-cols-[auto_40px_1fr] gap-4 px-4 py-3 items-start">
              <span className="mono text-xs text-text font-semibold">{e.code}</span>
              <span className="mono text-xs text-muted">{e.status}</span>
              <span className="mono text-xs text-dim">{e.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Rate limits */}
      <section className="space-y-4">
        <h2 className="mono text-sm font-semibold text-text border-b border-border pb-2">Rate limits</h2>
        <div className="border border-border divide-y divide-border">
          {[
            { plan: 'Free',       monthly: '500',       burst: '10 / min' },
            { plan: 'Team',       monthly: '10,000',    burst: '60 / min' },
            { plan: 'Enterprise', monthly: 'Unlimited', burst: 'Custom' },
            { plan: 'Demo key',   monthly: '10 / IP (lifetime)', burst: '5 / min' },
          ].map((r) => (
            <div key={r.plan} className="grid grid-cols-3 gap-4 px-4 py-3">
              <span className="mono text-xs text-text">{r.plan}</span>
              <span className="mono text-xs text-dim">{r.monthly} / month</span>
              <span className="mono text-xs text-dim">{r.burst}</span>
            </div>
          ))}
        </div>
      </section>
    </article>
  )
}

function EndpointBlock({ method, path, description, children }: {
  method: string; path: string; description: string; children: React.ReactNode
}) {
  const methodColor = method === 'POST' ? 'text-valid' : 'text-dim'
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className={`mono text-xs font-bold ${methodColor}`}>{method}</span>
          <span className="mono text-sm text-text">{path}</span>
        </div>
        <p className="mono text-xs text-dim">{description}</p>
      </div>
      {children}
    </section>
  )
}

function FieldTable({ title, fields }: {
  title: string
  fields: Array<{ name: string; type: string; required: boolean; desc: string }>
}) {
  return (
    <div className="space-y-2">
      <p className="mono text-xs text-muted">{title}</p>
      <div className="border border-border divide-y divide-border">
        <div className="grid grid-cols-[160px_80px_60px_1fr] gap-3 px-4 py-2 bg-surface">
          {['field', 'type', 'req', 'description'].map((h) => (
            <span key={h} className="mono text-xs text-muted">{h}</span>
          ))}
        </div>
        {fields.map((f) => (
          <div key={f.name} className="grid grid-cols-[160px_80px_60px_1fr] gap-3 px-4 py-3 items-start">
            <span className="mono text-xs text-text font-semibold">{f.name}</span>
            <span className="mono text-xs text-dim">{f.type}</span>
            <span className="mono text-xs text-muted">{f.required ? 'yes' : 'no'}</span>
            <span className="mono text-xs text-dim leading-relaxed">{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
