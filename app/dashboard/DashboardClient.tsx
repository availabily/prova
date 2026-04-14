'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatTimestamp } from '@/lib/api'
import VerdictBadge from '@/components/VerdictBadge'

interface CertSummary {
  id: string
  created_at: string
  verdict: 'VALID' | 'INVALID'
  confidence_score: number
  failure: { type: string } | null
}

interface UsageStats {
  total: number
  valid: number
  invalid: number
  monthly_limit: number
  plan: string
}

interface DashboardClientProps {
  certificates: CertSummary[]
  stats: UsageStats
  total: number
}

export default function DashboardClient({ certificates, stats, total }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'certificates' | 'keys'>('certificates')
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'VALID' | 'INVALID'>('all')

  const filteredCerts = certificates.filter((c) =>
    verdictFilter === 'all' ? true : c.verdict === verdictFilter
  )

  const validPct = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0
  const usagePct = Math.round((stats.total / stats.monthly_limit) * 100)

  return (
    <div className="grain min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-bg/90 backdrop-blur-sm">
        <Link href="/" className="mono text-sm text-text font-bold tracking-wider">PROVA</Link>
        <div className="flex items-center gap-4 mono text-xs text-dim">
          <Link href="/" className="hover:text-text transition-colors">verify →</Link>
          <button className="border border-border px-3 py-1 hover:border-muted transition-colors text-muted hover:text-dim">
            sign out
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-24 px-6 max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="animate-fade-up">
          <p className="mono text-xs text-muted tracking-widest uppercase mb-2">Dashboard</p>
          <h1 className="text-2xl font-bold text-text">Your certificates</h1>
        </div>

        {/* Stats row */}
        <div className="animate-fade-up animate-delay-100 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
          <StatCard label="total verifications" value={stats.total.toString()} />
          <StatCard label="valid" value={`${validPct}%`} accent="valid" />
          <StatCard label="invalid" value={`${100 - validPct}%`} accent="invalid" />
          <StatCard label="plan" value={stats.plan.toUpperCase()} />
        </div>

        {/* Usage meter */}
        <div className="animate-fade-up animate-delay-200 border border-border p-5 space-y-3">
          <div className="flex items-center justify-between mono text-xs">
            <span className="text-dim">{stats.total} / {stats.monthly_limit} verifications this month</span>
            <span className="text-muted">{usagePct}%</span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-text rounded-full transition-all"
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {stats.plan === 'free' && (
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
                  key={cert.id}
                  className="grid grid-cols-[1fr_140px_80px_100px_80px] gap-4 px-5 py-4 items-center hover:bg-surface/50 transition-colors"
                >
                  <div>
                    <p className="mono text-xs text-text">{cert.id}</p>
                    <p className="mono text-xs text-muted mt-0.5">
                      {formatTimestamp(cert.created_at)}
                    </p>
                  </div>
                  <span className="mono text-xs text-muted">
                    {new Date(cert.created_at).toLocaleDateString('en-GB')}
                  </span>
                  <VerdictBadge verdict={cert.verdict} size="sm" animate={false} />
                  <span className={`mono text-xs ${cert.failure ? 'text-invalid' : 'text-muted'}`}>
                    {cert.failure?.type ?? '—'}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/certificate/${cert.id}`}
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
              <Link
                href="/dashboard/api-keys"
                className="mono text-xs border border-border px-4 py-2 hover:border-muted transition-colors text-dim hover:text-text"
              >
                + manage keys
              </Link>
            </div>

            <div className="border border-border p-5 space-y-2">
              <p className="mono text-xs text-dim font-semibold">API Keys</p>
              <p className="mono text-xs text-muted leading-relaxed">
                Manage your API keys for programmatic access to Prova validation.
              </p>
              <Link
                href="/dashboard/api-keys"
                className="mono text-xs text-dim hover:text-text transition-colors"
              >
                Go to API key management →
              </Link>
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
