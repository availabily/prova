import { NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.prova.cobound.dev'

interface CertificatePayload {
  certificate_id: string
  timestamp: string
  verdict: string
  metadata?: {
    framework?: string
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { certificateId: string } },
) {
  const { certificateId } = params

  try {
    const res = await fetch(`${API_BASE}/certificate/${certificateId}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        {
          certificate_id: certificateId,
          issued_at: null,
          status: 'NOT_FOUND',
          framework: null,
          issuer: 'Prova Validation Engine',
          verified: false,
        },
        { status: 404 },
      )
    }

    const cert = (await res.json()) as CertificatePayload

    return NextResponse.json({
      certificate_id: cert.certificate_id,
      issued_at: cert.timestamp,
      status: cert.verdict,
      framework: cert.metadata?.framework ?? 'prova',
      issuer: 'Prova Validation Engine',
      verified: true,
    })
  } catch {
    return NextResponse.json(
      {
        certificate_id: certificateId,
        issued_at: null,
        status: 'UNAVAILABLE',
        framework: null,
        issuer: 'Prova Validation Engine',
        verified: false,
      },
      { status: 503 },
    )
  }
}
