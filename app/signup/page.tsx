'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    setLoading(false)

    if (signupError) {
      setError(signupError.message)
      return
    }

    const needsEmailVerification = Boolean(data.user) && !data.session
    const destination = needsEmailVerification
      ? '/dashboard?verifyEmail=1'
      : '/dashboard'

    router.push(destination)
  }

  return (
    <main className="grain min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md border border-border bg-bg p-6 space-y-5">
        <div>
          <p className="mono text-xs tracking-widest uppercase text-muted">Auth</p>
          <h1 className="text-2xl font-bold text-text mt-2">Sign up</h1>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {error && (
          <p className="mono text-xs text-invalid border border-invalid/40 bg-invalid/10 px-3 py-2">{error}</p>
        )}

        <p className="mono text-xs text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-dim hover:text-text">
            Log in →
          </Link>
        </p>
      </div>
    </main>
  )
}
