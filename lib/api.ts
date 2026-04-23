/**
 * lib/api.ts
 *
 * Typed fetch wrapper for the Prova API.
 * All calls go to api.prova.cobound.dev.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.prova.cobound.dev'

export interface GraphNode {
  id: string
  text: string
  type: 'premise' | 'claim' | 'conclusion'
}

export interface GraphEdge {
  from: string
  to: string
}

export interface ArgumentGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface KnownConsequence {
  id: string
  domain: string
  name: string
  consequence: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface FailureDetail {
  type: 'CIRCULAR' | 'CONTRADICTION' | 'UNSUPPORTED_LEAP'
  failure_id: string | null
  location: string
  description: string
  affected_nodes: string[]
  affected_edges: Array<{ from: string; to: string }>
  known_consequence: KnownConsequence | null
}

export interface Certificate {
  certificate_id: string
  timestamp: string
  verdict: 'VALID' | 'INVALID'
  confidence_score: number
  prova_version: string
  validator_version: string
  extraction_prompt_version: string
  argument_graph: ArgumentGraph
  failure: FailureDetail | null
  original_reasoning: string | null
  metadata: Record<string, unknown>
  certificate_url: string
  sha256: string
}

export interface ApiError {
  error: string
  message: string
  confidence_score?: number
}

export interface VerifyRequest {
  reasoning: string
  format?: 'auto' | 'structured' | 'prose'
  retain?: boolean
  metadata?: Record<string, unknown>
}

// ── Verify ────────────────────────────────────────────────────────────────

export async function verify(
  req: VerifyRequest,
  apiKey?: string
): Promise<{ data: Certificate | null; error: ApiError | null }> {
  try {
    const resolvedKey = apiKey ?? process.env.NEXT_PUBLIC_DEMO_API_KEY
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (resolvedKey) {
      headers['Authorization'] = `Bearer ${resolvedKey}`
    }

    const res = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(req),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({
        error: 'UNKNOWN',
        message: `HTTP ${res.status}`,
      }))
      return { data: null, error: err as ApiError }
    }

    const data = await res.json()
    return { data: data as Certificate, error: null }
  } catch (e) {
    return {
      data: null,
      error: { error: 'NETWORK_ERROR', message: 'Failed to reach the Prova API. Please try again.' },
    }
  }
}

// ── Get certificate ───────────────────────────────────────────────────────

export async function getCertificate(
  id: string
): Promise<{ data: Certificate | null; error: ApiError | null }> {
  try {
    const res = await fetch(`${API_BASE}/certificate/${id}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({
        error: 'NOT_FOUND',
        message: `Certificate ${id} not found.`,
      }))
      return { data: null, error: err as ApiError }
    }

    const data = await res.json()
    return { data: data as Certificate, error: null }
  } catch (e) {
    return {
      data: null,
      error: { error: 'NETWORK_ERROR', message: 'Failed to reach the Prova API.' },
    }
  }
}

// ── Health ────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    })
  } catch {
    return iso
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-invalid'
    case 'high':     return 'text-orange-400'
    case 'medium':   return 'text-yellow-400'
    default:         return 'text-dim'
  }
}
