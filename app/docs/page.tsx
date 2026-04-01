/**
 * app/docs/page.tsx — Quickstart
 *
 * Zero to first certificate in under 5 minutes.
 * Three code examples: curl, Python, JavaScript.
 * Uses demo key — no account required.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Quickstart — Prova Docs' }

export default function QuickstartPage() {
  return (
    <article className="prose-prova space-y-10">
      <div className="space-y-3">
        <p className="mono text-xs text-muted tracking-widest uppercase">Quickstart</p>
        <h1 className="text-3xl font-bold text-text">Zero to certificate in 5 minutes</h1>
        <p className="text-dim leading-relaxed">
          Prova has a single endpoint. Send it a reasoning chain. Get back a certificate.
          No account required to start — use the public demo key.
        </p>
      </div>

      {/* Step 1 */}
      <Section title="1. Send your first verification">
        <p className="mono text-xs text-dim leading-relaxed mb-4">
          The demo key works immediately. It allows 10 verifications per IP address.
          Create a free account for 500/month.
        </p>
        <CodeBlock lang="bash" label="curl">{`curl -X POST https://api.prova.cobound.dev/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "reasoning": "Step 1: The applicant has stable income, which means they can make payments. Step 2: Since they can make payments, the risk is low. Step 3: Therefore, approve the loan."
  }'`}</CodeBlock>
      </Section>

      {/* Step 2 */}
      <Section title="2. Read the certificate">
        <p className="mono text-xs text-dim leading-relaxed mb-4">
          The response is a certificate JSON. The two fields that matter most:
        </p>
        <CodeBlock lang="json" label="response">{`{
  "certificate_id": "PRV-2026-A7X4",
  "timestamp": "2026-03-27T14:32:01Z",
  "verdict": "VALID",
  "confidence_score": 97,
  "prova_version": "1.0.0",
  "validator_version": "0.1.0",
  "argument_graph": { "nodes": [...], "edges": [...] },
  "failure": null,
  "certificate_url": "https://prova.cobound.dev/certificate/PRV-2026-A7X4",
  "sha256": "e3b0c44..."
}`}</CodeBlock>
        <p className="mono text-xs text-dim leading-relaxed mt-4">
          <span className="text-valid">verdict: VALID</span> means the reasoning structure is sound.{' '}
          <span className="text-invalid">verdict: INVALID</span> means a structural failure was detected —
          check the <span className="text-text">failure</span> field for the exact location and type.
        </p>
      </Section>

      {/* Python */}
      <Section title="3. Python integration">
        <CodeBlock lang="python" label="python">{`import requests

response = requests.post(
    "https://api.prova.cobound.dev/verify",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "reasoning": """
            Step 1: The patient has a fever above 38.5°C.
            Step 2: A fever above 38.5°C indicates possible infection.
            Step 3: Possible infection requires antibiotic evaluation.
            Step 4: Therefore, order a blood culture and antibiotic review.
        """,
        "retain": True,
        "metadata": {"model": "gpt-4o", "pipeline": "medical-triage"}
    }
)

cert = response.json()
print(cert["verdict"])           # VALID or INVALID
print(cert["certificate_id"])    # PRV-2026-XXXX
print(cert["certificate_url"])   # share this link

if cert["verdict"] == "INVALID":
    failure = cert["failure"]
    print(f"Failure type: {failure['type']}")
    print(f"Location: {failure['location']}")
    print(f"Description: {failure['description']}")`}</CodeBlock>
      </Section>

      {/* JavaScript */}
      <Section title="4. JavaScript / TypeScript integration">
        <CodeBlock lang="typescript" label="typescript">{`const response = await fetch('https://api.prova.cobound.dev/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.PROVA_API_KEY}\`,
  },
  body: JSON.stringify({
    reasoning: agentDecisionLog,    // any string
    retain: true,
    metadata: {
      pipeline: 'loan-approval-v2',
      model: 'claude-sonnet-4-6',
    },
  }),
})

const cert = await response.json()

if (cert.verdict === 'INVALID') {
  // Log the certificate URL — it's permanent and shareable
  console.error('Invalid reasoning:', cert.certificate_url)
  // Optionally block the decision
  throw new Error(\`AI reasoning failed Prova check: \${cert.failure?.type}\`)
}

// Store the certificate ID alongside your decision record
await db.decisions.create({
  decision_id: yourDecisionId,
  prova_certificate_id: cert.certificate_id,
  prova_certificate_url: cert.certificate_url,
})`}</CodeBlock>
      </Section>

      {/* Exit codes */}
      <Section title="5. CLI usage">
        <CodeBlock lang="bash" label="terminal">{`# Install
pip install prova-validator

# Verify from a file
prova verify reasoning.txt

# Verify from stdin
echo "Since X is true, Y follows, therefore Z." | prova verify -

# JSON output
prova verify reasoning.txt --format json

# With domain hint for failure consequence mapping
prova verify reasoning.txt --domain medical

# Exit codes:
#   0 = VALID
#   1 = INVALID
#   2 = ERROR`}</CodeBlock>
      </Section>

      {/* Next steps */}
      <Section title="Next steps">
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: 'API Reference',        href: '/docs/api-reference',    desc: 'Every endpoint, field, and error code.' },
            { label: 'Certificate Guide',     href: '/docs/certificate-guide', desc: 'What every field means and how to use it.' },
            { label: 'Integration Examples', href: '/docs/integrations',     desc: 'LangGraph, CrewAI, and more.' },
            { label: 'Data & Privacy',        href: '/docs/privacy',          desc: 'What is stored and how.' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="border border-border p-4 hover:border-muted transition-colors space-y-1 block"
            >
              <p className="mono text-xs text-text">{item.label} →</p>
              <p className="mono text-xs text-muted">{item.desc}</p>
            </a>
          ))}
        </div>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="mono text-sm font-semibold text-text border-b border-border pb-2">{title}</h2>
      {children}
    </section>
  )
}

function CodeBlock({ lang, label, children }: { lang: string; label: string; children: string }) {
  return (
    <div className="border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
        <span className="mono text-xs text-muted">{label}</span>
        <span className="mono text-xs text-muted/50">{lang}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs mono text-dim leading-relaxed bg-[#0D0D0D]">
        <code>{children.trim()}</code>
      </pre>
    </div>
  )
}
