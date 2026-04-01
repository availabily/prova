import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="mono text-xs text-muted tracking-widest uppercase mb-6">404</p>
      <h1 className="text-3xl font-bold text-text mb-3">Certificate not found</h1>
      <p className="text-dim mono text-sm mb-8 max-w-sm">
        This certificate ID does not exist, or the URL may be incorrect.
        Certificates are permanent — if it was issued, it will always be here.
      </p>
      <Link
        href="/"
        className="mono text-xs border border-border px-6 py-3 hover:border-muted transition-colors text-dim hover:text-text"
      >
        verify a new reasoning chain →
      </Link>
    </div>
  )
}
