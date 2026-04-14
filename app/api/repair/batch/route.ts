import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.prova.cobound.dev'
const MAX_BATCH_SIZE = 20

type Verdict = 'VALID' | 'INVALID' | 'UNAVAILABLE'

interface RepairSuggestion {
  step_index: number
  issue: string
  suggestion: string
  revised_step: string
}

interface ValidationResult {
  certificate_id: string
  verdict: Verdict
  confidence_score: number
  repair_suggestions?: RepairSuggestion[]
}

interface BatchRepairResult {
  original: string
  repaired: string
  verdict_before: Verdict
  verdict_after: Verdict
  confidence_before: number
  confidence_after: number
  certificate_id: string
}

interface BatchRepairRequest {
  inputs?: unknown
}

function splitReasoning(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function applyRepairSuggestions(steps: string[], suggestions: RepairSuggestion[]): string[] {
  const next = [...steps]

  for (const suggestion of suggestions) {
    const idx = suggestion.step_index - 1
    if (idx >= 0 && idx < next.length && suggestion.revised_step?.trim()) {
      next[idx] = suggestion.revised_step.trim()
    }
  }

  return next
}

function joinReasoning(steps: string[]): string {
  return steps.join('\n')
}

async function validateReasoning(input: string): Promise<ValidationResult> {
  const response = await fetch(`${API_BASE}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reasoning: input }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Validation failed with status ${response.status}`)
  }

  return (await response.json()) as ValidationResult
}

async function processOne(input: string): Promise<BatchRepairResult> {
  const before = await validateReasoning(input)
  const suggestions = before.repair_suggestions ?? []

  const repaired = joinReasoning(
    applyRepairSuggestions(splitReasoning(input), suggestions)
  )

  const after = await validateReasoning(repaired)

  return {
    original: input,
    repaired,
    verdict_before: before.verdict,
    verdict_after: after.verdict,
    confidence_before: before.confidence_score,
    confidence_after: after.confidence_score,
    certificate_id: after.certificate_id,
  }
}

// Intentionally separated from the route body so this can be adapted to SSE streaming later.
async function processBatch(inputs: string[]): Promise<BatchRepairResult[]> {
  return Promise.all(inputs.map((input) => processOne(input)))
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('tier')
      .eq('id', user.id)
      .maybeSingle()

    const userTier = userRow?.tier === 'pro' ? 'pro' : 'free'
    if (userTier !== 'pro') {
      return NextResponse.json({ error: ' პრო plan required' }, { status: 403 })
    }

    const body = (await request.json()) as BatchRepairRequest
    const { inputs } = body

    if (!Array.isArray(inputs) || inputs.some((item) => typeof item !== 'string')) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { inputs: string[] }.' },
        { status: 400 }
      )
    }

    if (inputs.length === 0) {
      return NextResponse.json({ results: [] })
    }

    if (inputs.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Batch size limit exceeded. Max ${MAX_BATCH_SIZE} inputs.` },
        { status: 429 }
      )
    }

    const results = await processBatch(inputs)

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to process batch repair request',
      },
      { status: 500 }
    )
  }
}
