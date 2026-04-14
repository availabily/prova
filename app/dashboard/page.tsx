import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'

const PAGE_SIZE = 20

interface DashboardPageProps {
  searchParams?: {
    page?: string
  }
}

interface CertificateRow {
  id: string
  created_at: string
  verdict: 'VALID' | 'INVALID'
  metadata: {
    framework?: string
  } | null
}

function parsePage(value?: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleString()
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const page = parsePage(searchParams?.page)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: certificates, count, error } = await supabase
    .from('certificates')
    .select('id, created_at, verdict, metadata', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(error.message)
  }

  const rows = (certificates ?? []) as CertificateRow[]
  const totalRows = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <main className="grain min-h-screen px-6 py-16">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="mono text-xs text-muted tracking-widest uppercase">Dashboard</p>
          <h1 className="text-2xl font-bold text-text mt-2">Your certificates</h1>
        </div>

        {rows.length === 0 ? (
          <div className="border border-border p-8 text-center space-y-2">
            <p className="mono text-sm text-text">No certificates yet.</p>
            <p className="mono text-xs text-muted">
              Run a verification to generate your first certificate.
            </p>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            <div className="grid grid-cols-[1.3fr_1fr_120px_1fr_160px] gap-4 px-5 py-3 bg-surface">
              <span className="mono text-xs text-muted">certificate_id</span>
              <span className="mono text-xs text-muted">created_at</span>
              <span className="mono text-xs text-muted">status</span>
              <span className="mono text-xs text-muted">framework</span>
              <span className="mono text-xs text-muted text-right">pdf</span>
            </div>
            {rows.map((row) => {
              const status = row.verdict === 'VALID' ? 'pass' : 'fail'
              const framework = row.metadata?.framework ?? 'EU AI Act'
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-[1.3fr_1fr_120px_1fr_160px] gap-4 px-5 py-4 items-center"
                >
                  <span className="mono text-xs text-text break-all">{row.id}</span>
                  <span className="mono text-xs text-dim">{formatDate(row.created_at)}</span>
                  <span
                    className={`mono text-xs uppercase ${
                      status === 'pass' ? 'text-valid' : 'text-invalid'
                    }`}
                  >
                    {status}
                  </span>
                  <span className="mono text-xs text-dim">{framework}</span>
                  <a
                    href={`https://api.prova.cobound.dev/certificate/${row.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-xs text-right text-dim hover:text-text"
                  >
                    download pdf →
                  </a>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="mono text-xs text-muted">
            Page {Math.min(page, totalPages)} of {totalPages}
          </p>
          <div className="flex gap-2">
            {hasPrev ? (
              <Link
                href={`/dashboard?page=${page - 1}`}
                className="mono text-xs border border-border px-3 py-1.5 hover:border-muted"
              >
                ← previous
              </Link>
            ) : (
              <span className="mono text-xs border border-border px-3 py-1.5 text-muted/60">← previous</span>
            )}
            {hasNext ? (
              <Link
                href={`/dashboard?page=${page + 1}`}
                className="mono text-xs border border-border px-3 py-1.5 hover:border-muted"
              >
                next →
              </Link>
            ) : (
              <span className="mono text-xs border border-border px-3 py-1.5 text-muted/60">next →</span>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
