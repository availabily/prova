'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    router.push('/dashboard')
  }

  const handleMagicLinkLogin = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    setLoading(false)

    if (otpError) {
      setError(otpError.message)
      return
    }

    setMessage('Magic link sent. Check your email to continue.')
  }

  return (
    <main className="grain min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md border border-border bg-bg p-6 space-y-5">
        <div>
          <p className="mono text-xs tracking-widest uppercase text-muted">Auth</p>
          <h1 className="text-2xl font-bold text-text mt-2">Log in</h1>
        </div>

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="mono text-xs text-dim">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-muted"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="mono text-xs text-dim">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-muted"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mono text-xs uppercase border border-text text-text px-4 py-2 hover:bg-surface disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <button
          type="button"
          disabled={loading || !email}
          onClick={handleMagicLinkLogin}
          className="w-full mono text-xs uppercase border border-border text-muted px-4 py-2 hover:border-muted hover:text-dim disabled:opacity-60"
        >
          Send magic link
        </button>

        {message && (
          <p className="mono text-xs text-valid border border-valid/40 bg-valid/10 px-3 py-2">{message}</p>
        )}
        {error && (
          <p className="mono text-xs text-invalid border border-invalid/40 bg-invalid/10 px-3 py-2">{error}</p>
        )}

        <p className="mono text-xs text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-dim hover:text-text">
            Sign up →
          </Link>
        </p>
      </div>
    </main>
  )
}
