import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Data & Privacy — Prova Docs' }

export default function PrivacyPage() {
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
            { item: 'Certificate ID, timestamp, verdict, confidence score', stored: 'Always',                      note: 'Required for certificate to be valid and permanent.' },
            { item: 'Argument graph (nodes and edges)',                      stored: 'Always',                      note: 'Required for certificate page and D3 visualization.' },
            { item: 'Failure detail (type, location, description)',          stored: 'Always (if INVALID)',          note: 'Required for compliance documentation.' },
            { item: 'SHA-256 hash',                                          stored: 'Always',                      note: 'Required for independent verification.' },
            { item: 'Original reasoning text',                               stored: 'When retain=true (default)',   note: 'Set retain=false to prevent storage.' },
            { item: 'Caller metadata',                                       stored: 'When provided',               note: 'Pipeline names, model names, decision IDs you provide.' },
            { item: 'API key (raw)',                                         stored: 'Never',                       note: 'Only the SHA-256 hash of your key is stored.' },
            { item: 'Usage logs (request metadata)',                         stored: 'Always',                      note: 'Reasoning length, verdict, timestamp. Never reasoning content.' },
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
          <a href="mailto:kian@cobound.dev" className="text-text hover:underline">
            kian@cobound.dev
          </a>
          <br />
          For GDPR data subject requests, include your account email and the nature of the request.
        </p>
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
