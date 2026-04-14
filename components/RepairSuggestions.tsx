import type { RepairSuggestion } from '@/lib/api'
import AutoRepairButton from '@/components/AutoRepairButton'

interface RepairSuggestionsProps {
  suggestions: RepairSuggestion[]
  tier: 'free' | 'pro'
  certId: string
}

function SuggestionCard({ item }: { item: RepairSuggestion }) {
  return (
    <div className="border border-border bg-surface/30 p-4 space-y-2">
      {typeof item.step_index === 'number' ? (
        <p className="mono text-xs text-muted">step {item.step_index}</p>
      ) : (
        <p className="mono text-xs text-muted">matched step</p>
      )}
      <p className="mono text-xs text-dim"><span className="text-muted">issue:</span> {item.issue}</p>
      <p className="mono text-xs text-dim"><span className="text-muted">suggestion:</span> {item.suggestion}</p>
      <p className="mono text-xs text-dim"><span className="text-muted">revised:</span> {item.revised_step}</p>
    </div>
  )
}

function truncate(value: string, max = 72): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export default function RepairSuggestions({ suggestions, tier, certId }: RepairSuggestionsProps) {
  if (!suggestions.length) return null

  if (tier === 'pro') {
    return (
      <div className="space-y-4">
        {suggestions.map((item, idx) => (
          <SuggestionCard
            key={`${item.step_index ?? item.problematic_step ?? 'step'}-${idx}`}
            item={item}
          />
        ))}
      </div>
    )
  }

  const first = suggestions[0]
  const second = suggestions[1]
  const remainingCount = Math.max(suggestions.length - 2, 0)

  return (
    <div className="space-y-4">
      <SuggestionCard item={first} />

      {second && (
        <div className="relative border border-border bg-surface/30 p-4 space-y-2 overflow-hidden">
          {typeof second.step_index === 'number' ? (
            <p className="mono text-xs text-muted blur-sm select-none">step {second.step_index}</p>
          ) : (
            <p className="mono text-xs text-muted blur-sm select-none">matched step</p>
          )}
          <p className="mono text-xs text-dim blur-sm select-none"><span className="text-muted">issue:</span> {truncate(second.issue)}</p>
          <p className="mono text-xs text-dim blur-sm select-none"><span className="text-muted">suggestion:</span> {truncate(second.suggestion)}</p>
          <p className="mono text-xs text-dim blur-sm select-none"><span className="text-muted">revised:</span> {truncate(second.revised_step)}</p>
          <div className="absolute inset-0 flex items-center justify-center bg-bg/40">
            <span className="mono text-xs text-text border border-border px-3 py-1.5 bg-bg/80">Pro feature</span>
          </div>
        </div>
      )}

      {remainingCount > 0 && (
        <div className="mono text-xs text-muted border border-border bg-surface/30 p-4">
          +{remainingCount} more fixes
        </div>
      )}

      <AutoRepairButton certId={certId} />
    </div>
  )
}
