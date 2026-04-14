import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.prova.cobound.dev'

interface VerifyPageProps {
  params: { certificateId: string }
}

async function certificateExists(certificateId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/certificate/${certificateId}`, {
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { certificateId } = params
  const verified = await certificateExists(certificateId)

  return (
    <main className="grain min-h-screen flex items-center justify-center px-6">
      <section className="max-w-xl w-full border border-border bg-bg/80 backdrop-blur-sm p-10 text-center space-y-5">
        <p className="mono text-xs text-muted tracking-[0.25em] uppercase">Certificate Verification</p>
        <h1 className="mono text-3xl sm:text-4xl font-bold text-text tracking-tight">
          {verified ? 'This certificate is valid' : 'Not found'}
        </h1>
        <p className="mono text-xs text-dim break-all">{certificateId}</p>

        <div className="pt-4 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="mono text-xs border border-border px-4 py-2 hover:border-muted transition-colors text-dim hover:text-text"
          >
            back home
          </Link>
          {verified && (
            <Link
              href={`/certificate/${certificateId}`}
              className="mono text-xs border border-border px-4 py-2 hover:border-muted transition-colors text-dim hover:text-text"
            >
              view details
            </Link>
          )}
        </div>
      </section>
    </main>
  )
}
