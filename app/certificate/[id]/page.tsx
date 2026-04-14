/**
 * app/certificate/[id]/page.tsx — Screen 2: The Certificate
 *
 * Server component — fetches certificate at request time.
 * Certificate pages are public. No auth required.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCertificate, formatTimestamp, type RepairSuggestion } from '@/lib/api'
import VerdictBadge from '@/components/VerdictBadge'
import ArgumentGraphViz from '@/components/ArgumentGraph'
import CopyButton from '@/components/CopyButton'
import DisclaimerBlock from '@/components/DisclaimerBlock'
import RepairSuggestions from '@/components/RepairSuggestions'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await getCertificate(params.id)
  if (!data) return { title: 'Certificate not found — Prova' }
  return {
    title: `${data.certificate_id} · ${data.verdict} — Prova`,
    description: `Prova reasoning certificate. Verdict: ${data.verdict}. Confidence: ${data.confidence_score}/100.`,
    openGraph: {
      title: `${data.certificate_id} - ${data.verdict} - Prova Certificate`,
      description: `AI reasoning certificate. Verdict: ${data.verdict}. Confidence: ${data.confidence_score}/100. Verified by 2,400+ Lean 4 theorems.`,
      type: 'article',
    },
  }
}

export default async function CertificatePage({ params }: Props) {
  const { data: cert, error } = await getCertificate(params.id)

  if (!cert || error) notFound()

  const isValid = cert.verdict === 'VALID'
  const metadata = cert.metadata as Record<string, unknown>
  const metadataTier = metadata.tier === 'pro' || metadata.user_tier === 'pro' ? 'pro' : 'free'
  const userTier = cert.user_tier ?? metadataTier
  const rawSuggestions = cert.repair_suggestions ?? metadata.repair_suggestions ?? metadata.suggested_fixes
  const repairSuggestions = Array.isArray(rawSuggestions)
    ? rawSuggestions.filter(isRepairSuggestion)
    : []
  const borderColor = isValid ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
  const accentColor = isValid ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'

  return (
    <div className="grain min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-bg/90 backdrop-blur-sm">
        <Link href="/" className="mono text-sm text-text font-bold tracking-wider">PROVA</Link>
        <div className="flex items-center gap-4 mono text-xs text-dim">
          <Link href="/" className="hover:text-text transition-colors">verify →</Link>
        </div>
      </nav>

      <main className="pt-24 pb-24 px-6 max-w-3xl mx-auto space-y-10">

        {/* Certificate header */}
        <div
          className="animate-fade-up border p-8 space-y-6"
          style={{ borderColor, background: `linear-gradient(135deg, ${accentColor} 0%, transparent 60%)` }}
        >
          {/* ID + timestamp */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1">
              <p className="mono text-xs text-muted tracking-widest uppercase">Certificate</p>
              <p className="mono text-xl text-text font-bold tracking-wider">{cert.certificate_id}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="mono text-xs text-muted tracking-widest uppercase">Issued</p>
              <p className="mono text-xs text-dim">{formatTimestamp(cert.timestamp)}</p>
            </div>
          </div>

          {/* Verdict */}
          <div className="py-2">
            <VerdictBadge verdict={cert.verdict} size="lg" />
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-border">
            <MetaField label="confidence" value={`${cert.confidence_score}/100`} />
            <MetaField label="prova"      value={`v${cert.prova_version}`} />
            <MetaField label="validator"  value={`v${cert.validator_version}`} />
            <MetaField label="prompt"     value={cert.extraction_prompt_version} />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <CopyButton value={cert.certificate_url} label="copy url" successLabel="copied!" />
            <a
              href={`https://api.prova.cobound.dev/certificate/${cert.certificate_id}/pdf`}
              className="mono text-xs border border-border px-4 py-2 hover:border-muted transition-colors text-dim hover:text-text"
              target="_blank"
              rel="noopener noreferrer"
            >
              download pdf →
            </a>
            <DisputeButton certId={cert.certificate_id} />
          </div>
        </div>

        {/* Argument graph */}
        <div className="animate-fade-up animate-delay-100 space-y-3">
          <SectionLabel>Argument Graph</SectionLabel>
          <p className="mono text-xs text-muted">
            Drag nodes to explore. Hover for full claim text.
            {isValid
              ? ' All dependencies are structurally sound.'
              : ' Red nodes and edges indicate the failure location.'}
          </p>
          <ArgumentGraphViz
            graph={cert.argument_graph}
            verdict={cert.verdict}
            failure={cert.failure}
            height={360}
          />
        </div>

        {/* Failure diagnosis (INVALID only) */}
        {!isValid && cert.failure && (
          <div className="animate-fade-up animate-delay-200 border border-invalid/20 bg-invalid/5 p-6 space-y-5">
            <SectionLabel>Failure Diagnosis</SectionLabel>
            <div className="space-y-4">
              <DiagRow label="type">
                <span className="text-invalid font-bold">{cert.failure.type}</span>
              </DiagRow>
              <DiagRow label="location">
                <span className="text-dim">{cert.failure.location}</span>
              </DiagRow>
              <DiagRow label="description">
                <span className="text-dim leading-relaxed">{cert.failure.description}</span>
              </DiagRow>
              {cert.failure.known_consequence && (
                <DiagRow label="known consequence">
                  <div className="space-y-1">
                    <p className="text-text font-semibold">
                      {cert.failure.known_consequence.name}
                      <span className="ml-2 text-xs text-invalid uppercase tracking-wider">
                        {cert.failure.known_consequence.severity}
                      </span>
                    </p>
                    <p className="text-dim text-xs leading-relaxed">
                      {cert.failure.known_consequence.consequence}
                    </p>
                  </div>
                </DiagRow>
              )}
            </div>
          </div>
        )}

        {/* Repair suggestions (INVALID only) */}
        {!isValid && cert.failure && repairSuggestions.length > 0 && (
          <RepairSuggestions suggestions={repairSuggestions} tier={userTier} />
        )}

        {/* Original reasoning */}
        {cert.original_reasoning ? (
          <div className="animate-fade-up animate-delay-300 space-y-3">
            <SectionLabel>Original Reasoning Chain</SectionLabel>
            <div className="reasoning-block">{cert.original_reasoning}</div>
          </div>
        ) : (
          <div className="animate-fade-up animate-delay-300 border border-border p-4 mono text-xs text-muted">
            Original reasoning not stored (retain=false was set for this certificate).
          </div>
        )}

        {/* Verification */}
        <div className="animate-fade-up animate-delay-400 space-y-3">
          <SectionLabel>Independent Verification</SectionLabel>
          <div className="space-y-2 mono text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-muted">certificate url</span>
              <span className="text-dim break-all">{cert.certificate_url}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted">sha-256</span>
              <span className="text-dim break-all">{cert.sha256}</span>
            </div>
          </div>
          <p className="mono text-xs text-muted leading-relaxed">
            Recompute the SHA-256 over{' '}
            <code className="text-dim">timestamp + verdict + confidence_score + argument_graph + failure</code>{' '}
            to verify this certificate has not been modified since issuance.
          </p>
        </div>

        {/* Disclaimer */}
        <DisclaimerBlock />
      </main>
    </div>
  )
}


function isRepairSuggestion(value: unknown): value is RepairSuggestion {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.problematic_step === 'string'
    && typeof candidate.issue === 'string'
    && typeof candidate.revised_step === 'string'
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mono text-xs text-dim tracking-widest uppercase border-b border-border pb-2">
      {children}
    </p>
  )
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="mono text-xs text-muted">{label}</p>
      <p className="mono text-xs text-dim">{value}</p>
    </div>
  )
}

function DiagRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
      <span className="mono text-xs text-muted pt-0.5">{label}</span>
      <div className="mono text-xs">{children}</div>
    </div>
  )
}

function DisputeButton({ certId }: { certId: string }) {
  return (
    <a
      href={`mailto:kian@cobound.dev?subject=Dispute: ${certId}&body=Certificate ID: ${certId}%0A%0AI believe this result is incorrect because:%0A%0A`}
      className="mono text-xs border border-border px-4 py-2 hover:border-muted transition-colors text-muted hover:text-dim"
    >
      dispute result
    </a>
  )
}
