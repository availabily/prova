'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

interface ApiKey {
  id: string
  label: string | null
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRawKey, setNewRawKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchKeys = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('api_keys')
        .select('id, label, created_at, last_used_at, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setKeys(data || [])
    } catch (err) {
      console.error('Error fetching keys:', err)
      setError('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setNewRawKey(null)

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newKeyLabel || 'Unnamed key' }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to generate key')
        return
      }

      // Show the raw key ONCE
      setNewRawKey(data.raw_key)
      setNewKeyLabel('')
      setShowCreateForm(false)

      // Refresh the key list
      await fetchKeys()
    } catch (err) {
      setError('Failed to generate key')
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this key? This action cannot be undone.')) return

    try {
      const response = await fetch('/api/keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      })

      if (!response.ok) {
        setError('Failed to revoke key')
        return
      }

      await fetchKeys()
    } catch (err) {
      setError('Failed to revoke key')
    }
  }

  const maskKey = (id: string) => {
    // Show last 4 chars of the UUID as the "masked key"
    const last4 = id.slice(-4)
    return `prova_••••••••••••••${last4}`
  }

  return (
    <div className="grain min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-bg/90 backdrop-blur-sm">
        <Link href="/" className="mono text-sm text-text font-bold tracking-wider">PROVA</Link>
        <div className="flex items-center gap-4 mono text-xs text-dim">
          <Link href="/dashboard" className="hover:text-text transition-colors">dashboard →</Link>
        </div>
      </nav>

      <main className="pt-24 pb-24 px-6 max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <p className="mono text-xs text-muted tracking-widest uppercase mb-2">API Keys</p>
          <h1 className="text-2xl font-bold text-text">Manage your keys</h1>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* New key modal */}
        {newRawKey && (
          <div className="border border-valid bg-valid/5 p-5 space-y-3">
            <p className="mono text-xs text-dim font-semibold">New API key created</p>
            <p className="mono text-xs text-muted leading-relaxed">
              Copy this key now — it will never be shown again.
            </p>
            <div className="flex items-center gap-3">
              <code className="mono text-sm text-valid bg-surface px-3 py-2 rounded break-all flex-1">
                {newRawKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newRawKey)
                }}
                className="mono text-xs border border-border px-3 py-2 hover:border-muted transition-colors text-dim hover:text-text shrink-0"
              >
                copy
              </button>
            </div>
            <button
              onClick={() => setNewRawKey(null)}
              className="mono text-xs text-muted hover:text-dim transition-colors"
            >
              I've saved my key — dismiss →
            </button>
          </div>
        )}

        {/* Generate button */}
        <div className="animate-fade-up animate-delay-100">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="mono text-xs border border-border px-4 py-2 hover:border-muted transition-colors text-dim hover:text-text"
            >
              + generate new key
            </button>
          ) : (
            <div className="border border-border p-5 space-y-4">
              <p className="mono text-xs text-dim font-semibold">Create new API key</p>
              <div>
                <input
                  type="text"
                  placeholder="Key label (e.g. 'Production pipeline')"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-bg mono text-xs text-text placeholder:text-muted focus:outline-none focus:border-muted"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="mono text-xs border border-text px-4 py-2 text-text hover:bg-surface transition-colors disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Create key'}
                </button>
                <button
                  onClick={() => { setShowCreateForm(false); setNewKeyLabel('') }}
                  className="mono text-xs border border-border px-4 py-2 text-muted hover:text-dim transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Key list */}
        <div className="animate-fade-up animate-delay-200 border border-border divide-y divide-border">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_120px_80px] gap-4 px-5 py-3 bg-surface">
            {['label', 'created', 'last used', ''].map((h) => (
              <span key={h} className="mono text-xs text-muted">{h}</span>
            ))}
          </div>
          {/* Rows */}
          {loading ? (
            <div className="px-5 py-8 text-center">
              <p className="mono text-xs text-muted">Loading...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="mono text-xs text-muted">No API keys yet. Create one above.</p>
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className={`grid grid-cols-[1fr_120px_120px_80px] gap-4 px-5 py-4 items-center ${
                  !key.is_active ? 'opacity-50' : 'hover:bg-surface/50'
                } transition-colors`}
              >
                <div>
                  <p className="mono text-xs text-text">
                    {key.label || 'Unnamed key'}
                    {!key.is_active && (
                      <span className="ml-2 text-invalid">REVOKED</span>
                    )}
                  </p>
                  <p className="mono text-xs text-muted mt-0.5">
                    {maskKey(key.id)}
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
                <div>
                  {key.is_active ? (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="mono text-xs text-muted hover:text-invalid transition-colors"
                    >
                      revoke
                    </button>
                  ) : (
                    <span className="mono text-xs text-muted">—</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Security note */}
        <div className="border border-border p-5 space-y-2">
          <p className="mono text-xs text-dim font-semibold">Security note</p>
          <p className="mono text-xs text-muted leading-relaxed">
            API keys are shown only once at creation. Prova stores only the SHA-256 hash —
            the raw key is never retrievable. If you lose a key, revoke it and create a new one.
          </p>
        </div>
      </main>
    </div>
  )
}
