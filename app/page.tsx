'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { verify, type Certificate } from '@/lib/api'
import VerdictBadge from '@/components/VerdictBadge'

const EXAMPLES: { label: string; chain: string }[] = [
  {
    label: 'Loan approval',
    chain: 'Step 1: The applicant reports annual gross income of $92,000, verified against two years of tax returns. Step 2: With a monthly gross income of $7,667, the proposed mortgage payment of $1,840 represents a debt-to-income ratio of 24%. Step 3: A DTI ratio of 24% falls below our 36% threshold for conventional loan approval. Step 4: The applicant\'s credit score of 742 exceeds the minimum requirement of 680. Step 5: Since both DTI and credit score meet approval criteria, this application qualifies for standard rate conventional financing.',
  },
  {
    label: 'Medical triage',
    chain: 'Step 1: Patient presents with sudden onset right lower quadrant abdominal pain beginning 8 hours ago. Step 2: Physical examination reveals rebound tenderness and guarding localized to McBurney\'s point. Step 3: Complete blood count shows white blood cell count of 14,200 with left shift. Step 4: The combination of RLQ pain at McBurney\'s point, rebound tenderness, and elevated WBC with left shift meets the Alvarado score threshold of 7 or higher. Step 5: An Alvarado score of 7 or higher indicates high probability of acute appendicitis requiring surgical consultation. Step 6: Therefore, order CT abdomen with contrast and page the on-call surgical team for evaluation.',
  },
  {
    label: 'Circular risk model (invalid)',
    chain: 'Step 1: Our risk model assigns this portfolio a low-risk rating. Step 2: Because the portfolio is rated low-risk, we allocate minimal capital reserves against it. Step 3: With minimal capital reserves allocated, the portfolio\'s loss exposure is low. Step 4: Low loss exposure confirms that our risk model correctly assigned a low-risk rating. Step 5: Therefore, we recommend maintaining current positions without hedging.',
  },
  {
    label: 'Unsupported diagnosis (invalid)',
    chain: 'Step 1: The patient reports occasional mild headaches occurring two to three times per month. Step 2: Therefore, the patient should be scheduled for an urgent MRI to rule out glioblastoma.',
  },
]

const SAMPLE_VALID_ID = 'PRV-2026-C588'
const SAMPLE_INVALID_ID = 'PRV-2026-1019'

export default function HomePage() {
  const [reasoning, setReasoning] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Certificate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [examplesOpen, setExamplesOpen] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number>(0)
  const examplesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!examplesOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (examplesRef.current && !examplesRef.current.contains(e.target as Node)) {
        setExamplesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [examplesOpen])

  async function handleVerify() {
    if (!reasoning.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    setElapsed(null)
    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10)
    }, 100)

    const { data, error: apiError } = await verify({ reasoning: reasoning.trim() })

    if (timerRef.current) clearInterval(timerRef.current)
    setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10)

    if (apiError) {
      setError(apiError.message)
    } else if (data) {
      setResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleVerify()
  }

  return (
    <div className="grain min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 sm:px-8 py-4 border-b border-border bg-bg/95 backdrop-blur-md">
        <Link href="/" className="font-display text-sm text-text font-semibold tracking-wide">
          PROVA
        </Link>
        <div className="flex items-center gap-6 text-xs mono text-dim">
          <Link href="/docs" className="hover:text-text transition-colors duration-200">docs</Link>
          <Link href="/docs/certificate-guide" className="hover:text-text transition-colors duration-200">compliance</Link>
          <Link href="/pricing" className="hover:text-text transition-colors duration-200">pricing</Link>
          <a href="https://api.prova.cobound.dev/docs" target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors duration-200">api</a>
          <Link href="/dashboard" className="border border-border px-3 py-1.5 hover:border-dim transition-colors duration-200">sign in</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="pt-32 sm:pt-40 pb-8 px-6 sm:px-8 max-w-3xl mx-auto">
        {/* Status badge */}
        <div className="fade-up mb-8">
          <div className="inline-flex items-center gap-2.5 border border-border px-3.5 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-valid animate-pulse" />
            <span className="mono text-xs text-dim">Backed by 2,400+ formally verified Lean 4 theorems</span>
          </div>
        </div>

        {/* Headline */}
        <div className="fade-up delay-100 mb-6">
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-text leading-[1.08] tracking-tight">
            Does your AI<br />
            <span className="text-valid">reason correctly?</span>
          </h1>
        </div>

        {/* Subtitle */}
        <div className="fade-up delay-200 mb-14">
          <p className="text-dim text-lg leading-relaxed max-w-lg">
            Prove your AI&apos;s logic is sound. Paste any reasoning chain, get a formal certificate in seconds.
          </p>
        </div>

        {/* Verifier */}
        <div className="fade-up delay-300">
          <div className="border border-border focus-within:border-muted transition-colors duration-300 rounded-sm bg-surface/50">
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDER}
              className="w-full bg-transparent mono text-sm text-text placeholder:text-muted/50 resize-none outline-none p-6 min-h-[200px]"
              spellCheck={false}
              disabled={loading}
            />
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <span className="mono text-xs text-muted">
                {loading && elapsed !== null
                  ? `analyzing... ${elapsed.toFixed(1)}s`
                  : reasoning.length > 0
                    ? `${reasoning.length} chars`
                    : ''}
              </span>
              <div className="flex items-center gap-3">
                {/* Examples dropdown */}
                <div ref={examplesRef} className="relative">
                  <button
                    onClick={() => setExamplesOpen(o => !o)}
                    disabled={loading}
                    className="mono text-xs px-4 py-2.5 border border-border text-muted hover:text-text hover:border-muted transition-all duration-200 flex items-center gap-2 disabled:opacity-40"
                  >
                    try an example
                    <span className={`transition-transform duration-200 ${examplesOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {examplesOpen && (
                    <div className="absolute bottom-full right-0 mb-1 w-56 border border-border bg-bg z-50">
                      {EXAMPLES.map((ex) => (
                        <button
                          key={ex.label}
                          onClick={() => { setReasoning(ex.chain); setExamplesOpen(false) }}
                          className="w-full text-left mono text-xs px-4 py-2.5 text-dim hover:text-text hover:bg-surface/60 transition-colors duration-150 border-b border-border last:border-b-0"
                        >
                          {ex.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Verify button */}
                <button
                  onClick={handleVerify}
                  disabled={!reasoning.trim() || loading}
                  className={`mono text-xs px-6 py-2.5 tracking-widest transition-all duration-300 font-semibold bg-valid text-bg disabled:opacity-20 ${
                    loading
                      ? 'verify-loading'
                      : 'hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {loading ? 'VERIFYING...' : 'VERIFY'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 border border-invalid/20 bg-invalid/5 px-5 py-3 mono text-xs text-invalid fade-up">
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div
            ref={resultRef}
            className="mt-12 verdict-animate border p-8 space-y-5"
            style={{
              borderColor: result.verdict === 'VALID' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              background: result.verdict === 'VALID'
                ? 'linear-gradient(135deg, rgba(34,197,94,0.04) 0%, transparent 50%)'
                : 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, transparent 50%)',
            }}
          >
            <VerdictBadge verdict={result.verdict} size="lg" />
            <div className="mono text-xs text-dim space-y-2 pt-3">
              <div className="flex items-center gap-3">
                <span className="text-muted w-20">certificate</span>
                <Link href={`/certificate/${result.certificate_id}`} className="text-text hover:underline underline-offset-4">{result.certificate_id}</Link>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted w-20">confidence</span>
                <span className="text-text">{result.confidence_score}/100</span>
              </div>
              {elapsed !== null && (
                <div className="flex items-center gap-3">
                  <span className="text-muted w-20">time</span>
                  <span className="text-text">{elapsed.toFixed(1)}s</span>
                </div>
              )}
              {result.failure && (
                <div className="flex items-center gap-3">
                  <span className="text-muted w-20">failure</span>
                  <span className="text-invalid font-semibold">{result.failure.type}</span>
                  <span className="text-muted">at</span>
                  <span className="text-dim">{result.failure.location}</span>
                </div>
              )}
            </div>
            <div className="pt-2">
              <Link href={`/certificate/${result.certificate_id}`} className="inline-flex mono text-xs border border-border px-5 py-2.5 hover:border-dim transition-colors duration-200 text-dim hover:text-text">
                view full certificate
              </Link>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-10 mono text-xs text-muted leading-relaxed fade-up delay-400">
          Prova verifies logical structure only, not factual accuracy, ethical appropriateness, or fitness for purpose.{' '}
          <Link href="/docs/certificate-guide" className="text-dim hover:text-text transition-colors duration-200">
            What does a certificate mean?
          </Link>
        </p>
      </main>

      {/* Trust stats */}
      <section className="px-6 sm:px-8 max-w-3xl mx-auto pb-8">
        <div className="hr-fade mb-12" />
        <div className="grid grid-cols-3 gap-8 mb-12">
          <TrustStat number="2,400+" label="Lean 4 theorems" delay={0} />
          <TrustStat number="0" label="axioms assumed" delay={100} title="Every step in the proof chain is verified from first principles. Nothing is assumed." />
          <TrustStat number="100%" label="formally verified" delay={200} />
        </div>
      </section>

      {/* EU AI Act */}
      <section className="px-6 sm:px-8 pb-24 max-w-3xl mx-auto">
        <div className="border border-border p-8 sm:p-10 bg-surface/30">
          <p className="mono text-xs text-valid tracking-widest uppercase mb-4">EU AI Act</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-text mb-4 leading-tight">
            August 2026 deadline.<br />
            <span className="text-dim">Are you ready?</span>
          </h2>
          <p className="text-dim text-sm leading-relaxed mb-6 max-w-lg">
            The EU AI Act requires demonstrable proof that high-risk AI systems reason correctly.
            Prova generates the formal certificates you need, backed by mathematically verified
            theorems, not heuristics.
          </p>
          <a
            href="mailto:kian@cobound.dev?subject=Prova%20Enterprise%20Inquiry"
            className="inline-flex mono text-xs border border-valid/30 text-valid px-5 py-2.5 hover:border-valid hover:bg-valid/5 transition-all duration-200"
          >
            talk to us about compliance
          </a>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-6 sm:px-8 max-w-3xl mx-auto pb-12">
        <p className="mono text-xs text-muted text-center leading-relaxed">
          Built for teams verifying AI reasoning in healthcare, financial services, and legal technology.
          <br />
          Compliance-ready for EU AI Act, FDA AI guidance, and SEC algorithmic audit requirements.
        </p>
      </section>

      {/* Sample certificates */}
      <section className="px-6 sm:px-8 pb-24 max-w-3xl mx-auto">
        <div className="border-t border-border pt-16 mb-10">
          <p className="mono text-xs text-dim tracking-widest uppercase mb-2">Example certificates</p>
          <p className="text-dim text-sm">Real reasoning chains verified by Prova.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <SampleCertCard
            id={SAMPLE_VALID_ID}
            verdict="VALID"
            label="Mortgage approval reasoning"
            confidence={100}
            snippet="DTI ratio of 24% falls below the 36% threshold. Credit score of 742 exceeds the 680 minimum. Since both criteria are met, the application qualifies for standard rate conventional financing."
          />
          <SampleCertCard
            id={SAMPLE_INVALID_ID}
            verdict="INVALID"
            label="Portfolio risk model reasoning"
            confidence={0}
            failureType="CIRCULAR"
            snippet="Portfolio is low-risk, so we allocate minimal reserves. Minimal reserves mean low loss exposure. Low loss exposure confirms the low-risk rating..."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 sm:px-8 pb-24 max-w-3xl mx-auto">
        <div className="border-t border-border pt-16 mb-10">
          <p className="mono text-xs text-dim tracking-widest uppercase mb-2">How it works</p>
          <p className="text-dim text-sm">Three layers. Zero heuristics.</p>
        </div>
        <div className="space-y-8">
          <HowStep number="01" title="Extract" description="Claude identifies the logical structure: premises, claims, dependencies, and conclusions. Your reasoning chain becomes a directed graph." />
          <HowStep number="02" title="Verify" description="The cobound-validator checks the graph topology. If H1(K;Z) = 0, the argument has no circular dependencies. This is a mathematical fact, not a statistical guess." />
          <HowStep number="03" title="Certify" description="A permanent, tamper-evident certificate is issued with a SHA-256 integrity hash. Valid certificates confirm structural soundness. Invalid certificates pinpoint exactly where reasoning fails." />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 sm:px-8 py-10">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="font-display text-sm text-text font-semibold">PROVA</div>
            <div className="mono text-xs text-muted">
              <a href="https://cobound.dev" className="hover:text-dim transition-colors duration-200">cobound.dev</a>
            </div>
            <div className="mono text-xs text-muted/40">
              <Link href="/docs/certificate-guide" className="hover:text-muted transition-colors duration-200">H<sup>1</sup>(K;Z) = 0</Link> iff argument is structurally valid
            </div>
          </div>
          <div className="flex gap-8 mono text-xs text-muted">
            <Link href="/docs" className="hover:text-dim transition-colors duration-200">docs</Link>
            <Link href="/pricing" className="hover:text-dim transition-colors duration-200">pricing</Link>
            <a href="https://github.com/insinuateai/prova" target="_blank" rel="noopener noreferrer" className="hover:text-dim transition-colors duration-200">github</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function TrustStat({ number, label, delay, title }: { number: string; label: string; delay: number; title?: string }) {
  return (
    <div className="text-center stat-animate" style={{ animationDelay: `${delay}ms` }} title={title}>
      <div className="font-display text-2xl sm:text-3xl font-bold text-text">{number}</div>
      <div className="mono text-xs text-muted mt-1">{label}</div>
    </div>
  )
}

function SampleCertCard({ id, verdict, label, confidence, failureType, snippet }: {
  id: string; verdict: 'VALID' | 'INVALID'; label: string; confidence: number; failureType?: string; snippet: string
}) {
  const isReal = !id.includes('DEMO') && !id.includes('FAIL')
  const content = (
    <>
      <div className="flex items-center justify-between">
        <VerdictBadge verdict={verdict} size="sm" animate={false} />
        <span className="mono text-xs text-muted">{confidence}/100</span>
      </div>
      <div className="mono text-xs text-dim font-medium">{label}</div>
      {failureType && <div className="mono text-xs text-invalid">{failureType}</div>}
      <p className="text-xs text-muted leading-relaxed line-clamp-3">{snippet}</p>
      <div className="mono text-xs text-muted">{isReal ? id : `${id} (demo)`}</div>
    </>
  )
  if (isReal) {
    return (
      <Link
        href={`/certificate/${id}`}
        className="block border border-border hover:border-muted transition-all duration-200 p-6 space-y-3 group bg-surface/30 hover:bg-surface/50"
      >
        {content}
      </Link>
    )
  }
  return (
    <div className="block border border-border p-6 space-y-3 bg-surface/30 opacity-70">
      {content}
    </div>
  )
}

function HowStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-6 items-start">
      <div className="mono text-xs text-valid/40 pt-1 shrink-0 w-6">{number}</div>
      <div>
        <h3 className="font-display text-lg font-semibold text-text mb-2">{title}</h3>
        <p className="text-dim text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

const PLACEHOLDER = `Paste any AI reasoning chain here.

Example:
Step 1: The applicant has a stable income, which means they can make payments.
Step 2: Since they can make payments, the loan risk is low.
Step 3: Low-risk loans meet our approval criteria.
Step 4: Therefore, we should approve this loan.`
