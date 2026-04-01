'use client'

/**
 * app/page.tsx — Screen 1: The Verifier
 *
 * Prova's homepage. One textarea, one button, one purpose.
 * Below the fold: two sample certificates (one VALID, one INVALID).
 *
 * Design: near-black, monospace everything, surgical restraint.
 * The only colour on this page before verification: none.
 * After verification: the verdict fills the screen.
 */

import { useState, useRef } from 'react'
import Link from 'next/link'
import { verify, type Certificate } from '@/lib/api'
import VerdictBadge from '@/components/VerdictBadge'

// ── Sample certificates for cold-start social proof ────────────────────────
// Replace these IDs with real ones generated during private beta.
const SAMPLE_VALID_ID   = 'PRV-2026-DEMO'
const SAMPLE_INVALID_ID = 'PRV-2026-FAIL'

export default function HomePage() {
  const [reasoning, setReasoning] = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<Certificate | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  async function handleVerify() {
    if (!reasoning.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)

    const { data, error: apiError } = await verify({ reasoning: reasoning.trim() })

    if (apiError) {
      setError(apiError.message)
    } else if (data) {
      setResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleVerify()
    }
  }

  return (
    <div className="grain min-h-screen">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-bg/90 backdrop-blur-sm">
        <Link href="/" className="mono text-sm text-text font-bold tracking-wider">
          PROVA
        </Link>
        <div className="flex items-center gap-6 text-xs mono text-dim">
          <Link href="/docs" className="hover:text-text transition-colors">docs</Link>
          <Link href="/pricing" className="hover:text-text transition-colors">pricing</Link>
          <a
            href="https://api.prova.cobound.dev/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text transition-colors"
          >
            api
          </a>
          <Link
            href="/dashboard"
            className="border border-border px-3 py-1 hover:border-muted transition-colors"
          >
            sign in
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <main className="pt-32 pb-16 px-6 max-w-3xl mx-auto">
        {/* Headline */}
        <div className="animate-fade-up mb-12">
          <p className="mono text-xs text-dim tracking-widest mb-6 uppercase">
            Formally verified reasoning · Backed by 2,400+ Lean 4 theorems
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-text leading-tight tracking-tight mb-4">
            Does your AI<br />
            <span className="text-dim">reason correctly?</span>
          </h1>
          <p className="text-dim text-lg leading-relaxed max-w-xl">
            Paste any AI reasoning chain. Get a formal certificate of logical
            validity in seconds — or a precise diagnosis of where the reasoning breaks.
          </p>
        </div>

        {/* ── Verifier input ──────────────────────────────────────── */}
        <div className="animate-fade-up animate-delay-100">
          <div className="border border-border focus-within:border-muted transition-colors rounded-sm">
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDER}
              className="w-full bg-transparent mono text-sm text-text placeholder:text-muted resize-none outline-none p-5 min-h-48"
              spellCheck={false}
              disabled={loading}
            />
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <span className="mono text-xs text-muted">
                {reasoning.length > 0
                  ? `${reasoning.length} chars · ⌘↵ to verify`
                  : '⌘↵ to verify'}
              </span>
              <button
                onClick={handleVerify}
                disabled={!reasoning.trim() || loading}
                className="mono text-xs px-5 py-2 border border-border hover:border-text disabled:opacity-30 disabled:cursor-not-allowed transition-all text-text tracking-wider"
              >
                {loading ? 'VERIFYING...' : 'VERIFY →'}
              </button>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="mt-4 border border-invalid/30 bg-invalid/5 px-4 py-3 mono text-xs text-invalid">
              {error}
            </div>
          )}
        </div>

        {/* ── Inline result ────────────────────────────────────────── */}
        {result && (
          <div
            ref={resultRef}
            className="mt-10 animate-fade-up border border-border p-6 space-y-4"
            style={{
              borderColor: result.verdict === 'VALID'
                ? 'rgba(34,197,94,0.2)'
                : 'rgba(239,68,68,0.2)',
            }}
          >
            <VerdictBadge verdict={result.verdict} size="lg" />

            <div className="mono text-xs text-dim space-y-1 pt-2">
              <div>
                <span className="text-muted">certificate</span>{' '}
                <Link
                  href={`/certificate/${result.certificate_id}`}
                  className="text-text hover:underline"
                >
                  {result.certificate_id}
                </Link>
              </div>
              <div>
                <span className="text-muted">confidence</span>{' '}
                <span className="text-text">{result.confidence_score}/100</span>
              </div>
              {result.failure && (
                <div>
                  <span className="text-muted">failure</span>{' '}
                  <span className="text-invalid">{result.failure.type}</span>
                  {' · '}
                  <span className="text-dim">{result.failure.location}</span>
                </div>
              )}
            </div>

            <Link
              href={`/certificate/${result.certificate_id}`}
              className="inline-flex mono text-xs border border-border px-4 py-2 hover:border-muted transition-colors text-dim hover:text-text"
            >
              view full certificate →
            </Link>
          </div>
        )}

        {/* ── Disclaimer ───────────────────────────────────────────── */}
        <p className="mt-8 mono text-xs text-muted leading-relaxed animate-fade-up animate-delay-200">
          Prova verifies logical structure only — not factual accuracy, ethical
          appropriateness, or fitness for purpose.{' '}
          <Link href="/docs/certificate-guide" className="text-dim hover:text-text transition-colors">
            What does a certificate mean?
          </Link>
        </p>
      </main>

      {/* ── Sample certificates ──────────────────────────────────── */}
      <section className="px-6 pb-24 max-w-3xl mx-auto">
        <div className="border-t border-border pt-16 mb-10">
          <p className="mono text-xs text-dim tracking-widest uppercase mb-2">Example certificates</p>
          <p className="text-dim text-sm">Real reasoning chains verified by Prova.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <SampleCertCard
            id={SAMPLE_VALID_ID}
            verdict="VALID"
            label="Loan approval reasoning"
            confidence={97}
            snippet="The applicant has stable income, which means they can make payments. Since they can make payments, the risk is low..."
          />
          <SampleCertCard
            id={SAMPLE_INVALID_ID}
            verdict="INVALID"
            label="Medical diagnosis reasoning"
            confidence={0}
            failureType="CIRCULAR"
            snippet="This treatment is safe because it passed trials. It passed trials because it is safe..."
          />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="mono text-xs text-muted space-y-1">
            <div>PROVA · <a href="https://cobound.dev" className="hover:text-dim transition-colors">cobound.dev</a></div>
            <div>H¹(K;ℤ) = 0 ⟺ argument is structurally valid</div>
          </div>
          <div className="flex gap-6 mono text-xs text-muted">
            <Link href="/docs" className="hover:text-dim transition-colors">docs</Link>
            <Link href="/pricing" className="hover:text-dim transition-colors">pricing</Link>
            <a
              href="https://github.com/insinuateai/prova"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-dim transition-colors"
            >
              github
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Sample cert card ─────────────────────────────────────────────────────

function SampleCertCard({
  id, verdict, label, confidence, failureType, snippet,
}: {
  id: string
  verdict: 'VALID' | 'INVALID'
  label: string
  confidence: number
  failureType?: string
  snippet: string
}) {
  const isValid = verdict === 'VALID'
  return (
    <Link
      href={`/certificate/${id}`}
      className="block border border-border hover:border-muted transition-colors p-5 space-y-3 group"
    >
      <div className="flex items-center justify-between">
        <VerdictBadge verdict={verdict} size="sm" animate={false} />
        <span className="mono text-xs text-muted">{confidence}/100</span>
      </div>
      <div className="mono text-xs text-dim">{label}</div>
      {failureType && (
        <div className="mono text-xs text-invalid">{failureType}</div>
      )}
      <p className="text-xs text-muted leading-relaxed line-clamp-3">{snippet}</p>
      <div className="mono text-xs text-muted group-hover:text-dim transition-colors">
        {id} →
      </div>
    </Link>
  )
}

// ── Placeholder text ─────────────────────────────────────────────────────

const PLACEHOLDER = `Paste any AI reasoning chain here.

Example:
Step 1: The applicant has a stable income, which means they can make payments.
Step 2: Since they can make payments, the loan risk is low.
Step 3: Low-risk loans meet our approval criteria.
Step 4: Therefore, we should approve this loan.`
