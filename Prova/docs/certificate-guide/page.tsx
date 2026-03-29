/**
 * app/docs/certificate-guide/page.tsx — Certificate Guide
 */
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Certificate Guide — Prova Docs' }

export default function CertificateGuidePage() {
  return (
    <article className="space-y-10">
      <div className="space-y-3">
        <p className="mono text-xs text-muted tracking-widest uppercase">Certificate Guide</p>
        <h1 className="text-3xl font-bold text-text">Understanding Prova Certificates</h1>
        <p className="text-dim leading-relaxed">
          A Prova certificate is a permanent, tamper-evident record that a specific
          AI reasoning chain was formally analyzed and found to be structurally valid or invalid.
        </p>
      </div>

      <Section title="What a certificate proves — and what it doesn't">
        <div className="border border-valid/20 bg-valid/5 p-5 space-y-2 mb-4">
          <p className="mono text-xs text-valid font-semibold">A VALID certificate proves:</p>
          <ul className="space-y-1">
            {[
              'The argument\'s claims form a directed acyclic dependency graph (H¹ = 0)',
              'No claim uses its own conclusion as a premise (no circular reasoning)',
              'No two premises make mutually exclusive assertions',
              'Every claim is reachable from at least one stated premise',
            ].map(p => (
              <li key={p} className="mono text-xs text-dim flex gap-2">
                <span className="text-valid shrink-0">—</span>{p}
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-border p-5 space-y-2">
          <p className="mono text-xs text-muted font-semibold">A certificate does NOT prove:</p>
          <ul className="space-y-1">
            {[
              'The facts in the argument are true (factual accuracy)',
              'The conclusion is ethically appropriate',
              'The reasoning complies with any specific regulation',
              'The AI system is safe, aligned, or fit for purpose',
            ].map(p => (
              <li key={p} className="mono text-xs text-dim flex gap-2">
                <span className="text-muted shrink-0">—</span>{p}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Certificate fields explained">
        <div className="space-y-4">
          {FIELD_EXPLANATIONS.map(({ field, explanation }) => (
            <div key={field} className="grid grid-cols-[160px_1fr] gap-4 border-b border-border pb-4">
              <span className="mono text-xs text-text font-semibold pt-0.5">{field}</span>
              <p className="mono text-xs text-dim leading-relaxed">{explanation}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Interpreting the confidence score">
        <p className="mono text-xs text-dim leading-relaxed mb-4">
          The confidence score (0–100) reflects how reliably the argument graph was
          extracted from the original text — not how logically strong the argument is.
        </p>
        <div className="border border-border divide-y divide-border">
          {[
            { range: '90–100', meaning: 'Extraction was clean and unambiguous. All nodes and edges are clearly defined.' },
            { range: '70–89',  meaning: 'Extraction was successful but some structure was inferred. The verdict is reliable.' },
            { range: '0–69',   meaning: 'Extraction confidence was too low — Prova returns EXTRACTION_AMBIGUOUS instead of a certificate.' },
          ].map(r => (
            <div key={r.range} className="grid grid-cols-[80px_1fr] gap-4 px-4 py-3">
              <span className="mono text-xs text-text">{r.range}</span>
              <span className="mono text-xs text-dim">{r.meaning}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Failure types">
        <div className="space-y-4">
          {[
            {
              type: 'CIRCULAR',
              description: 'The argument graph contains a cycle. A claim depends (directly or indirectly) on itself. This is circular reasoning — the conclusion cannot be established because it is assumed in the process of establishing it.',
              example: '"This treatment is safe because it passed trials. It passed trials because it is safe."',
            },
            {
              type: 'CONTRADICTION',
              description: 'Two or more premises make mutually exclusive assertions. Both are treated as true, but they cannot simultaneously hold. Any conclusion built on contradictory premises is formally unsound.',
              example: '"The patient has no fever (premise 1) and the patient has a high fever (premise 2), therefore..."',
            },
            {
              type: 'UNSUPPORTED_LEAP',
              description: 'A claim asserts it follows from prior claims, but there is no reasoning path connecting it to any stated premise. An intermediate step is missing.',
              example: '"We observed increased web traffic. Therefore, we should acquire the company."',
            },
          ].map(f => (
            <div key={f.type} className="border border-invalid/20 bg-invalid/5 p-5 space-y-3">
              <p className="mono text-xs text-invalid font-bold">{f.type}</p>
              <p className="mono text-xs text-dim leading-relaxed">{f.description}</p>
              <p className="mono text-xs text-muted italic">{f.example}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Independent verification">
        <p className="mono text-xs text-dim leading-relaxed">
          Every certificate includes a SHA-256 hash. To independently verify a certificate
          has not been tampered with, recompute the hash over the canonical JSON of these fields:
          <span className="text-text"> timestamp + verdict + confidence_score + argument_graph + failure</span>.
          The result must match the <span className="text-text">sha256</span> field in the certificate.
        </p>
        <pre className="border border-border p-4 mono text-xs text-dim bg-[#0D0D0D] mt-4 overflow-x-auto">{`import hashlib, json

def verify_cert(cert: dict) -> bool:
    payload = {
        "timestamp":        cert["timestamp"],
        "verdict":          cert["verdict"],
        "confidence_score": cert["confidence_score"],
        "argument_graph":   cert["argument_graph"],
        "failure":          cert["failure"],
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    computed = hashlib.sha256(canonical.encode()).hexdigest()
    return computed == cert["sha256"]`}</pre>
      </Section>

      <Section title="Using certificates in compliance documentation">
        <p className="mono text-xs text-dim leading-relaxed">
          For EU AI Act, FDA, or SEC compliance purposes, a Prova certificate provides:
        </p>
        <ul className="space-y-2 mt-3">
          {[
            'A timestamped record of when reasoning was verified',
            'The exact version of Prova and cobound-validator used (mathematical traceability)',
            'A permanent URL that auditors can independently access and verify',
            'A downloadable PDF suitable for inclusion in audit packages',
            'A SHA-256 hash for cryptographic proof of non-tampering',
          ].map(item => (
            <li key={item} className="mono text-xs text-dim flex gap-2">
              <span className="text-dim shrink-0">—</span>{item}
            </li>
          ))}
        </ul>
        <p className="mono text-xs text-muted leading-relaxed mt-4">
          Note: A Prova certificate demonstrates that AI reasoning was formally analyzed.
          It is one component of a compliance record — not a substitute for legal counsel
          or a complete regulatory compliance certification.
        </p>
      </Section>
    </article>
  )
}

const FIELD_EXPLANATIONS = [
  { field: 'certificate_id',    explanation: 'PRV-YYYY-XXXX format. The year and 4-character suffix derived from the SHA-256 hash. Permanent and unique.' },
  { field: 'timestamp',         explanation: 'ISO 8601 UTC timestamp of when the analysis was run. This is the legal anchor — it proves verification occurred at this moment.' },
  { field: 'verdict',           explanation: 'VALID or INVALID. The primary output of the analysis.' },
  { field: 'confidence_score',  explanation: '0–100. How reliably the argument graph was extracted from the text. 90+ is clean; 70–89 is good but some inference occurred.' },
  { field: 'prova_version',     explanation: 'The version of Prova that generated this certificate. For legal traceability.' },
  { field: 'validator_version', explanation: 'The version of cobound-validator (the formal proof engine) used. The mathematical guarantee is tied to this version.' },
  { field: 'argument_graph',    explanation: 'The extracted logical dependency graph: nodes (claims) and edges (dependencies). Use this to render your own visualisations.' },
  { field: 'failure',           explanation: 'Null if VALID. On INVALID: type, location, description, affected nodes/edges, and known downstream consequence.' },
  { field: 'original_reasoning',explanation: 'The reasoning text as submitted. Null if retain=false was set.' },
  { field: 'certificate_url',   explanation: 'Permanent public URL. Anyone with this URL can view the certificate. Never expires.' },
  { field: 'sha256',            explanation: 'SHA-256 hash over the core analytical fields. Allows independent verification that the certificate has not been modified.' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="mono text-sm font-semibold text-text border-b border-border pb-2">{title}</h2>
      {children}
    </section>
  )
}


/**
 * ============================================================
 * app/docs/privacy/page.tsx — Data & Privacy
 * ============================================================
 */
// Export this as a separate file: app/docs/privacy/page.tsx

export function PrivacyPage() {
  return (
    <article className="space-y-10">
      <div className="space-y-3">
        <p className="mono text-xs text-muted tracking-widest uppercase">Data & Privacy</p>
        <h1 className="text-3xl font-bold text-text">Data & Privacy</h1>
        <p className="text-dim leading-relaxed">
          What Prova stores, for how long, and how to control it.
        </p>
      </div>

      <Section title="What is stored">
        <div className="border border-border divide-y divide-border">
          {[
            { item: 'Certificate ID, timestamp, verdict, confidence score', stored: 'Always', note: 'Required for certificate to be valid and permanent.' },
            { item: 'Argument graph (nodes and edges)',                      stored: 'Always', note: 'Required for certificate page and D3 visualization.' },
            { item: 'Failure detail (type, location, description)',          stored: 'Always (if INVALID)', note: 'Required for compliance documentation.' },
            { item: 'SHA-256 hash',                                          stored: 'Always', note: 'Required for independent verification.' },
            { item: 'Original reasoning text',                               stored: 'When retain=true (default)', note: 'Set retain=false to prevent storage.' },
            { item: 'Caller metadata',                                       stored: 'When provided', note: 'Pipeline names, model names, decision IDs you provide.' },
            { item: 'API key (raw)',                                         stored: 'Never', note: 'Only the SHA-256 hash of your key is stored.' },
            { item: 'Usage logs (request metadata)',                         stored: 'Always', note: 'Reasoning length, verdict, timestamp. Never reasoning content.' },
          ].map(r => (
            <div key={r.item} className="grid grid-cols-[1fr_140px] gap-4 px-4 py-3 items-start">
              <div>
                <p className="mono text-xs text-text">{r.item}</p>
                <p className="mono text-xs text-muted mt-0.5">{r.note}</p>
              </div>
              <span className="mono text-xs text-dim">{r.stored}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="retain=false mode">
        <p className="mono text-xs text-dim leading-relaxed">
          Set <span className="text-text">retain: false</span> in your API request and the original
          reasoning text is processed entirely in memory — it is never written to disk or database.
          The certificate is still generated, stored, and permanently accessible, but without the
          reasoning text. This mode is designed for regulated industries where sending
          proprietary or sensitive reasoning chains to a third party requires minimised data exposure.
        </p>
      </Section>

      <Section title="What Prova does NOT do">
        <ul className="space-y-2">
          {[
            'Train any AI model on submitted reasoning chains',
            'Share reasoning chains with third parties',
            'Use submitted content for any purpose other than generating your certificate',
            'Store raw API keys (only SHA-256 hashes)',
            'Sell data or allow advertising targeting based on submitted content',
          ].map(item => (
            <li key={item} className="mono text-xs text-dim flex gap-2">
              <span className="text-valid shrink-0">✓</span> {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Certificate permanence">
        <p className="mono text-xs text-dim leading-relaxed">
          Certificates are never deleted. This is by design — a certificate used in a
          regulatory audit or legal proceeding must remain accessible indefinitely.
          If a certificate contains an error and a corrected certificate is issued,
          the original is marked as superseded but remains permanently accessible,
          linked to the correction.
        </p>
      </Section>

      <Section title="EU data residency">
        <p className="mono text-xs text-dim leading-relaxed">
          Currently, all data is stored in Supabase US region. EU data residency
          (data stored exclusively within the European Economic Area) is available
          on the Enterprise plan. Contact us to discuss your requirements.
        </p>
      </Section>

      <Section title="Data retention">
        <p className="mono text-xs text-dim leading-relaxed">
          Certificates: permanent (never deleted).
          Usage logs: retained for 24 months then anonymised.
          Account data: retained while your account is active, deleted within 30 days of account closure.
          Reasoning text (retain=true): retained with the certificate permanently.
          Reasoning text (retain=false): never stored.
        </p>
      </Section>

      <Section title="Contact">
        <p className="mono text-xs text-dim leading-relaxed">
          Data questions:{' '}
          <a href="mailto:kian@cobound.dev" className="text-text hover:underline">kian@cobound.dev</a>
          <br />
          For GDPR data subject requests, include your account email and the nature of the request.
        </p>
      </Section>
    </article>
  )
}
