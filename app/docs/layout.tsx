/**
 * app/docs/layout.tsx
 *
 * Shared layout for all documentation pages.
 * Left sidebar navigation + right content area.
 */

import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation — Prova',
}

const NAV = [
  { label: 'Quickstart',           href: '/docs' },
  { label: 'API Reference',        href: '/docs/api-reference' },
  { label: 'Certificate Guide',    href: '/docs/certificate-guide' },
  { label: 'Integration Examples', href: '/docs/integrations' },
  { label: 'Data & Privacy',       href: '/docs/privacy' },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border bg-bg/90 backdrop-blur-sm">
        <Link href="/" className="mono text-sm text-text font-bold tracking-wider">PROVA</Link>
        <div className="flex items-center gap-6 text-xs mono text-dim">
          <Link href="/pricing" className="hover:text-text transition-colors">pricing</Link>
          <Link href="/" className="hover:text-text transition-colors">verify →</Link>
        </div>
      </nav>

      <div className="pt-16 flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-border pt-10 px-6 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <p className="mono text-xs text-muted tracking-widest uppercase mb-6">Documentation</p>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block mono text-xs text-dim hover:text-text py-1.5 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-10 pt-6 border-t border-border space-y-2">
            <a
              href="https://api.prova.cobound.dev/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="block mono text-xs text-muted hover:text-dim transition-colors"
            >
              interactive api ↗
            </a>
            <a
              href="https://github.com/insinuateai/prova"
              target="_blank"
              rel="noopener noreferrer"
              className="block mono text-xs text-muted hover:text-dim transition-colors"
            >
              github ↗
            </a>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 px-8 py-10 max-w-3xl">
          {children}
        </main>
      </div>
    </div>
  )
}
