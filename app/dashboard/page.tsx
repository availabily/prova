'use client'

/**
 * app/dashboard/page.tsx — Screen 3: Dashboard
 *
 * Auth-gated. Shows usage, certificate history, API key management.
 * For now: a complete UI shell that works with Supabase auth.
 * Supabase auth implementation is a follow-up task.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatTimestamp } from '@/lib/api'
import VerdictBadge from '@/components/VerdictBadge'
import { supabase } from '@/lib/supabaseClient'

// ── Types ────────────────────────────────────────────────────────────────

interface CertSummary {
  certificate_id: string
  timestamp: string
  verdict: 'VALID' | 'INVALID'
  confidence_score: number
  failure_type: string | null
  certificate_url: string
}

interface ApiKey {
  id: string
  label: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

interface UsageStats {
  total: number
  valid: number
  invalid: number
  monthly_limit: number
  plan: string
}

// ── Mock data (replace with real Supabase queries) ────────────────────────

const MOCK_STATS: UsageStats = {
  total: 47,
  valid: 39,
  invalid: 8,
  monthly_limit: 500,
  plan: 'free',
}

const MOCK_CERTS: CertSummary[] = [
  { certificate_id: 'PRV-2026-A7X4', timestamp: '2026-03-27T14:32:01Z', verdict: 'VALID',   confidence_score: 97, failure_type: null,               certificate_url: '/certificate/PRV-2026-A7X4' },
  { certificate_id: 'PRV-2026-B2M9', timestamp: '2026-03-27T11:15:42Z', verdict: 'INVALID', confidence_score: 88, failure_type: 'CIRCULAR',          certificate_url: '/certificate/PRV-2026-B2M9' },
  { certificate_id: 'PRV-2026-C3N1', timestamp: '2026-03-26T09:03:17Z', verdict: 'VALID',   confidence_score: 94, failure_type: null,               certificate_url: '/certificate/PRV-2026-C3N1' },
  { certificate_id: 'PRV-2026-D4P2', timestamp: '2026-03-25T16:44:33Z', verdict: 'INVALID', confidence_score: 91, failure_type: 'UNSUPPORTED_LEAP', certificate_url: '/certificate/PRV-2026-D4P2' },
  { certificate_id: 'PRV-2026-E5Q3', timestamp: '2026-03-24T08:21:09Z', verdict: 'VALID',   confidence_score: 100, failure_type: null,              certificate_url: '/certificate/PRV-2026-E5Q3' },
]

const MOCK_KEYS: ApiKey[] = [
  { id: '1', label: 'Production pipeline',  created_at: '2026-03-01T00:00:00Z', last_used_at: '2026-03-27T14:32:01Z', is_active: true },
  { id: '2', label: 'Staging environment',  created_at: '2026-03-15T00:00:00Z', last_used_at: '2026-03-20T09:00:00Z', is_active: true },
]

// ── Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'certificates' | 'keys'>('certificates')
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'VALID' | 'INVALID'>('all')
  const [showVerifyToast, setShowVerifyToast] = useState(false)

  useEffect(() => {
    if (searchParams.get('verifyEmail') === '1') {
      setShowVerifyToast(true)
    }
  }, [searchParams])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredCerts = MOCK_CERTS.filter((c) =>
    verdictFilter === 'all' ? true : c.verdict === verdictFilter
  )

  const validPct = Math.round((MOCK_STATS.valid / MOCK_STATS.total) * 100)
  const usagePct = Math.round((MOCK_STATS.total / MOCK_STATS.monthly_limit) * 100)

  return (
    <div className="grain min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-bg/90 backdrop-blur-sm">
        <Link href="/" className="mono text-sm text-text font-bold tracking-wider">PROVA</Link>
        <div className="flex items-center gap-4 mono text-xs text-dim">
          <Link href="/" className="hover:text-text transition-colors">verify →</Link>
          <button
            onClick={handleSignOut}
            className="border border-border px-3 py-1 hover:border-muted transition-colors text-muted hover:text-dim"
          >
            sign out
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-24 px-6 max-w-5xl mx-auto space-y-8">
        {showVerifyToast && (
          <div className="border border-valid/40 bg-valid/10 px-4 py-3 flex items-center justify-between gap-4">
            <p className="mono text-xs text-valid">
              Verify your email to complete account activation.
            </p>
            <button
              onClick={() => setShowVerifyToast(false)}
              className="mono text-xs text-valid hover:opacity-70"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Header */}
        <div className="animate-fade-up">
          <p className="mono text-xs text-muted tracking-widest uppercase mb-2">Dashboard</p>
          <h1 className="text-2xl font-bold text-text">Your certificates</h1>
        </div>

        {/* Stats row */}
        <div className="animate-fade-up animate-delay-100 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
          <StatCard label="total verifications" value={MOCK_STATS.total.toString()} />
          <StatCard label="valid" value={`${validPct}%`} accent="valid" />
          <StatCard label="invalid" value={`${100 - validPct}%`} accent="invalid" />
          <StatCard label="plan" value={MOCK_STATS.plan.toUpperCase()} />
        </div>

        {/* Usage meter */}
        <div className="animate-fade-up animate-delay-200 border border-border p-5 space-y-3">
          <div className="flex items-center justify-between mono text-xs">
            <span className="text-dim">{MOCK_STATS.total} / {MOCK_STATS.monthly_limit} verifications this month</span>
            <span className="text-muted">{usagePct}%</span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-text rounded-full transition-all"
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {MOCK_STATS.plan === 'free' && (
            <div className="flex items-center justify-between">
              <p className="mono text-xs text-muted">Free plan · 500/month</p>
              <Link href="/pricing" className="mono text-xs text-dim hover:text-text transition-colors">
                upgrade →
              </Link>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="animate-fade-up animate-delay-200 border-b border-border flex gap-6">
          {(['certificates', 'keys'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mono text-xs pb-3 -mb-px transition-colors capitalize ${
                activeTab === tab
                  ? 'text-text border-b border-text'
                  : 'text-muted hover:text-dim'
              }`}
            >
              {tab === 'keys' ? 'api keys' : tab}
            </button>
          ))}
        </div>

        {/* Certificates tab */}
        {activeTab === 'certificates' && (
          <div className="animate-fade-in space-y-4">
            {/* Filters + export */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                {(['all', 'VALID', 'INVALID'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setVerdictFilter(f)}
                    className={`mono text-xs px-3 py-1.5 border transition-colors ${
                      verdictFilter === f
                        ? 'border-text text-text'
                        : 'border-border text-muted hover:border-muted hover:text-dim'
                    }`}
                  >
                    {f.toLowerCase()}
                  </button>
                ))}
              </div>
              <button className="mono text-xs border border-border px-4 py-1.5 hover:border-muted transition-colors text-muted hover:text-dim">
                export compliance package →
              </button>
            </div>

            {/* Certificate table */}
            <div className="border border-border divide-y divide-border">
              {/* Header */}
              <div className="grid grid-cols-[1fr_140px_80px_100px_80px] gap-4 px-5 py-3 bg-surface">
                {['certificate', 'issued', 'verdict', 'failure', ''].map((h) => (
                  <span key={h} className="mono text-xs text-muted">{h}</span>
                ))}
              </div>
              {/* Rows */}
              {filteredCerts.map((cert) => (
                <div
                  key={cert.certificate_id}
                  className="grid grid-cols-[1fr_140px_80px_100px_80px] gap-4 px-5 py-4 items-center hover:bg-surface/50 transition-colors"
                >
                  <div>
                    <p className="mono text-xs text-text">{cert.certificate_id}</p>
                    <p className="mono text-xs text-muted mt-0.5">
                      {formatTimestamp(cert.timestamp)}
                    </p>
                  </div>
                  <span className="mono text-xs text-muted">
                    {new Date(cert.timestamp).toLocaleDateString('en-GB')}
                  </span>
                  <VerdictBadge verdict={cert.verdict} size="sm" animate={false} />
                  <span className={`mono text-xs ${cert.failure_type ? 'text-invalid' : 'text-muted'}`}>
                    {cert.failure_type ?? '—'}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={cert.certificate_url}
                      className="mono text-xs text-muted hover:text-dim transition-colors"
                    >
                      view →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {filteredCerts.length === 0 && (
              <p className="mono text-xs text-muted text-center py-8">
                No certificates match this filter.
              </p>
            )}
          </div>
        )}

        {/* API Keys tab */}
        {activeTab === 'keys' && (
          <div className="animate-fade-in space-y-4">
            <div className="flex justify-end">
              <button className="mono text-xs border border-border px-4 py-2 hover:border-muted transition-colors text-dim hover:text-text">
                + create new key
              </button>
            </div>

            <div className="border border-border divide-y divide-border">
              <div className="grid grid-cols-[1fr_120px_120px_80px] gap-4 px-5 py-3 bg-surface">
                {['label', 'created', 'last used', ''].map((h) => (
                  <span key={h} className="mono text-xs text-muted">{h}</span>
                ))}
              </div>
              {MOCK_KEYS.map((key) => (
                <div
                  key={key.id}
                  className="grid grid-cols-[1fr_120px_120px_80px] gap-4 px-5 py-4 items-center"
                >
                  <div>
                    <p className="mono text-xs text-text">{key.label}</p>
                    <p className="mono text-xs text-muted mt-0.5">
                      sk-prova-••••••••••••••••
                    </p>
                  </div>
                  <span className="mono text-xs text-muted">
                    {new Date(key.created_at).toLocaleDateString('en-GB')}
                  </span>
                  <span className="mono text-xs text-muted">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString('en-GB')
                      : 'never'}
                  </span>
                  <button className="mono text-xs text-muted hover:text-invalid transition-colors text-left">
                    revoke
                  </button>
                </div>
              ))}
            </div>

            <div className="border border-border p-5 space-y-2">
              <p className="mono text-xs text-dim font-semibold">Security note</p>
              <p className="mono text-xs text-muted leading-relaxed">
                API keys are shown only once at creation. Prova stores only the SHA-256 hash —
                the raw key is never retrievable. If you lose a key, revoke it and create a new one.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({
  label, value, accent,
}: {
  label: string; value: string; accent?: 'valid' | 'invalid'
}) {
  return (
    <div className="bg-bg p-5 space-y-2">
      <p className="mono text-xs text-muted">{label}</p>
      <p className={`mono text-2xl font-bold ${
        accent === 'valid'   ? 'text-valid'   :
        accent === 'invalid' ? 'text-invalid' :
        'text-text'
      }`}>
        {value}
      </p>
    </div>
  )
}
