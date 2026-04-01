/**
 * app/pricing/page.tsx — Pricing
 *
 * Three columns. Free, Team, Enterprise.
 * The product sells itself — a sample certificate is embedded.
 * No credit card required in large type under the free plan.
 */

import Link from 'next/link'
import type { Metadata } from 'next'
import DisclaimerBlock from '@/components/DisclaimerBlock'

export const metadata: Metadata = {
  title: 'Pricing — Prova',
  description: 'Start free. Scale as you grow. Enterprise plans for regulated industries.',
}

const PLANS = [
  {
    name: 'Free',
    price: null,
    priceLabel: '$0',
    period: 'forever',
    cta: 'start verifying',
    ctaHref: '/',
    ctaStyle: 'border',
    highlight: false,
    noCreditCard: true,
    limit: '500 verifications / month',
    features: [
      'Full certificate with SHA-256 hash',
      'Permanent public certificate URLs',
      'Interactive argument graph',
      'Plain English failure diagnosis',
      'API access (demo key)',
      'JSON + PDF export',
    ],
    note: null,
  },
  {
    name: 'Team',
    price: 499,
    priceLabel: '$499',
    period: 'per month',
    cta: 'start team trial',
    ctaHref: 'mailto:kian@cobound.dev?subject=Prova Team Trial',
    ctaStyle: 'filled',
    highlight: true,
    noCreditCard: false,
    limit: '10,000 verifications / month',
    features: [
      'Everything in Free',
      'Private API key',
      'Usage dashboard',
      'Compliance package export (ZIP of PDFs)',
      'retain=false privacy mode',
      '60 req / minute burst rate',
      'Overage billing ($0.05 / req)',
    ],
    note: 'Most popular for AI teams in regulated industries.',
  },
  {
    name: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    period: 'contact us',
    cta: 'contact us',
    ctaHref: 'mailto:kian@cobound.dev?subject=Prova Enterprise',
    ctaStyle: 'border',
    highlight: false,
    noCreditCard: false,
    limit: 'Unlimited verifications',
    features: [
      'Everything in Team',
      'EU data residency',
      'SLA + uptime guarantee',
      'Dedicated support',
      'Custom certificate branding',
      'SSO / SAML',
      'SOC 2 documentation package',
      'Custom rate limits',
    ],
    note: 'For organisations with EU AI Act, FDA, or SEC compliance requirements.',
  },
]

// Sample certificate data for the embedded display
const SAMPLE_CERT = {
  id: 'PRV-2026-A7X4',
  timestamp: '27 March 2026 at 14:32:01 UTC',
  verdict: 'VALID' as const,
  confidence: 97,
  prova: '1.0.0',
  validator: '0.1.0',
}

export default function PricingPage() {
  return (
    <div className="grain min-h-screen">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-bg/90 backdrop-blur-sm">
        <Link href="/" className="mono text-sm text-text font-bold tracking-wider">
          PROVA
        </Link>
        <div className="flex items-center gap-6 text-xs mono text-dim">
          <Link href="/docs" className="hover:text-text transition-colors">docs</Link>
          <Link href="/" className="hover:text-text transition-colors">verify →</Link>
        </div>
      </nav>

      <main className="pt-28 pb-24 px-6 max-w-5xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="animate-fade-up mb-16 max-w-xl">
          <p className="mono text-xs text-muted tracking-widest uppercase mb-4">Pricing</p>
          <h1 className="text-4xl font-bold text-text mb-4">
            Start free.<br />
            <span className="text-dim">Scale when you need to.</span>
          </h1>
          <p className="text-dim text-sm leading-relaxed">
            Every plan produces the same formally verified certificate.
            The difference is volume, privacy controls, and compliance tooling.
          </p>
        </div>

        {/* ── Plan grid ───────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-px bg-border animate-fade-up animate-delay-100">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`
                bg-bg p-8 flex flex-col gap-6
                ${plan.highlight ? 'ring-1 ring-text/10' : ''}
              `}
            >
              {/* Plan header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="mono text-xs text-muted tracking-widest uppercase">{plan.name}</p>
                  {plan.highlight && (
                    <span className="mono text-xs border border-text/20 text-dim px-2 py-0.5">
                      popular
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-text mono">{plan.priceLabel}</span>
                  <span className="mono text-xs text-muted">{plan.period}</span>
                </div>
                {plan.noCreditCard && (
                  <p className="mono text-xs text-valid font-semibold">
                    No credit card required
                  </p>
                )}
                <p className="mono text-xs text-dim border-t border-border pt-3 mt-3">
                  {plan.limit}
                </p>
              </div>

              {/* CTA */}
              <a
                href={plan.ctaHref}
                className={`
                  mono text-xs text-center py-3 px-4 transition-all
                  ${plan.ctaStyle === 'filled'
                    ? 'bg-text text-bg hover:bg-text/90'
                    : 'border border-border hover:border-muted text-dim hover:text-text'
                  }
                `}
              >
                {plan.cta} →
              </a>

              {/* Features */}
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 mono text-xs text-dim">
                    <span className="text-muted mt-0.5 shrink-0">—</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Note */}
              {plan.note && (
                <p className="mono text-xs text-muted leading-relaxed border-t border-border pt-4">
                  {plan.note}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ── Sample certificate ───────────────────────────────────── */}
        <div className="mt-20 animate-fade-up animate-delay-200">
          <p className="mono text-xs text-muted tracking-widest uppercase mb-6">
            What you get — a real certificate
          </p>
          <div className="border border-valid/20 bg-valid/5 p-8 max-w-2xl">
            {/* Header row */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="mono text-xs text-muted mb-1">Certificate</p>
                <p className="mono text-lg font-bold text-text">{SAMPLE_CERT.id}</p>
              </div>
              <div className="text-right">
                <p className="mono text-xs text-muted mb-1">Issued</p>
                <p className="mono text-xs text-dim">{SAMPLE_CERT.timestamp}</p>
              </div>
            </div>

            {/* Verdict */}
            <div className="mb-6">
              <span className="mono text-4xl font-bold verdict-valid">✓ VALID</span>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-4 gap-4 border-t border-border pt-4 mb-6">
              {[
                ['confidence', `${SAMPLE_CERT.confidence}/100`],
                ['prova', `v${SAMPLE_CERT.prova}`],
                ['validator', `v${SAMPLE_CERT.validator}`],
                ['prompt', 'v1'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="mono text-xs text-muted mb-1">{label}</p>
                  <p className="mono text-xs text-dim">{value}</p>
                </div>
              ))}
            </div>

            {/* Graph placeholder */}
            <div
              className="border border-border mb-6 flex items-center justify-center"
              style={{ height: 140, background: '#0D0D0D' }}
            >
              <p className="mono text-xs text-muted">
                interactive argument graph — drag to explore
              </p>
            </div>

            <DisclaimerBlock />
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <div className="mt-20 animate-fade-up animate-delay-300 max-w-2xl">
          <p className="mono text-xs text-muted tracking-widest uppercase mb-8">FAQ</p>
          <div className="space-y-0 divide-y divide-border">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="mono text-sm text-dim hover:text-text cursor-pointer list-none flex items-center justify-between gap-4">
                  {q}
                  <span className="text-muted group-open:rotate-45 transition-transform duration-200 shrink-0">+</span>
                </summary>
                <p className="mono text-xs text-muted leading-relaxed mt-4">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ──────────────────────────────────────────── */}
        <div className="mt-20 animate-fade-up animate-delay-400 border border-border p-10 text-center">
          <p className="text-2xl font-bold text-text mb-3">
            Ready to prove your AI reasons correctly?
          </p>
          <p className="mono text-sm text-dim mb-8">
            No account required. Paste a reasoning chain and get your first certificate in 30 seconds.
          </p>
          <Link
            href="/"
            className="mono text-sm border border-text px-8 py-4 hover:bg-text hover:text-bg transition-all inline-block"
          >
            start verifying free →
          </Link>
        </div>
      </main>
    </div>
  )
}

const FAQ = [
  {
    q: 'What does "logical structure" mean exactly?',
    a: 'Prova checks whether the argument\'s claims form a valid dependency graph — no circular reasoning (where a conclusion supports its own premise), no contradictions (where two premises cannot both be true), and no unsupported leaps (where a claim asserts it follows from prior claims that don\'t actually support it). It does not check whether the facts in the argument are true.',
  },
  {
    q: 'What AI reasoning chains can Prova analyze?',
    a: 'Any chain-of-thought output from any AI model — Claude, GPT-4, Gemini, Llama, and others. Also agent decision logs from orchestration frameworks like LangGraph, CrewAI, and AutoGen. The reasoning can be numbered steps, flowing prose, or conditional branches.',
  },
  {
    q: 'What is the EU AI Act compliance use case?',
    a: 'The EU AI Act requires high-risk AI systems (credit, hiring, medical, legal) to provide auditable, explainable reasoning trails. Prova\'s certificate is a timestamped, formally grounded document that proves a specific AI decision was backed by logically valid reasoning at a specific moment. It fills the gap that logging and monitoring tools leave open.',
  },
  {
    q: 'Are my reasoning chains stored?',
    a: 'By default, yes — they\'re stored alongside the certificate to make the certificate complete and auditable. If you set retain=false in your API request, the reasoning text is processed in memory and never written to disk. Certificate metadata (verdict, confidence, graph structure) is always stored for the certificate to remain valid.',
  },
  {
    q: 'What is EU data residency and when will it be available?',
    a: 'Enterprise plan customers can request that all data (reasoning chains and certificates) be stored in Supabase\'s EU region, ensuring no data leaves the European Economic Area. Available on Enterprise — contact us to discuss timelines.',
  },
  {
    q: 'What is the mathematical foundation?',
    a: 'Prova uses Čech cohomology to detect structural failures in argument graphs. A logically valid argument corresponds to a graph where H¹(K;ℤ) = 0 — no cohomological obstructions. Circular reasoning, contradictions, and unsupported leaps each correspond to different types of non-trivial H¹. This is formally proved in 2,400+ Lean 4 theorems in the cobound repository.',
  },
]
