import { NextResponse } from 'next/server'
import type { RepairSuggestion } from '@/lib/api'
import { getCertificate, isRepairSuggestion, verify } from '@/lib/api'

function applyRepairSuggestions(reasoning: string, suggestions: RepairSuggestion[]): string {
  const steps = reasoning.split('\n')

  for (const suggestion of suggestions) {
    if (typeof suggestion.step_index === 'number') {
      const idx = suggestion.step_index
      if (idx >= 0 && idx < steps.length) {
        steps[idx] = suggestion.revised_step
        continue
      }
      if (idx > 0 && idx - 1 < steps.length) {
        steps[idx - 1] = suggestion.revised_step
        continue
      }
    }

    if (typeof suggestion.problematic_step === 'string' && suggestion.problematic_step.length > 0) {
      const atIndex = steps.findIndex((line) => line.includes(suggestion.problematic_step as string))
      if (atIndex >= 0) {
        steps[atIndex] = steps[atIndex].replace(suggestion.problematic_step, suggestion.revised_step)
      }
    }
  }

  return steps.join('\n')
}

async function validateReasoning(repairedReasoning: string) {
  return verify({
    reasoning: repairedReasoning,
    retain: true,
  })
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { data: cert, error } = await getCertificate(params.id)

  if (error || !cert) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Certificate not found.' }, { status: 404 })
  }

  if (!cert.original_reasoning) {
    return NextResponse.json(
      { error: 'MISSING_REASONING', message: 'Certificate does not include original reasoning.' },
      { status: 400 },
    )
  }

  const metadata = (cert.metadata ?? {}) as Record<string, unknown>
  const rawSuggestions =
    cert.repair_suggestions ??
    metadata.repair_suggestions ??
    metadata.suggested_fixes

  const suggestions = Array.isArray(rawSuggestions)
    ? rawSuggestions.filter(isRepairSuggestion)
    : []

  const repairedReasoning = applyRepairSuggestions(cert.original_reasoning, suggestions)
  const validation = await validateReasoning(repairedReasoning)

  if (!validation.data || validation.error) {
    return NextResponse.json(
      {
        error: validation.error?.error ?? 'REVALIDATION_FAILED',
        message: validation.error?.message ?? 'Failed to validate repaired reasoning.',
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    repaired_reasoning: repairedReasoning,
    new_certificate_id: validation.data.certificate_id,
    verdict: validation.data.verdict,
    confidence: validation.data.confidence_score,
  })
}
