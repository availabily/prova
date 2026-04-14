import { Lock } from 'lucide-react'

export interface RepairSuggestion {
  problematic_step: string
  issue: string
  revised_step: string
}

interface RepairSuggestionsProps {
  suggestions: RepairSuggestion[]
  tier?: 'free' | 'pro'
}

export default function RepairSuggestions({ suggestions, tier = 'free' }: RepairSuggestionsProps) {
  if (!suggestions.length) {
    return null
  }

  const isPro = tier === 'pro'

  return (
    <section className="animate-fade-up animate-delay-300 border border-border p-6 space-y-5">
      <p className="mono text-xs text-dim tracking-widest uppercase border-b border-border pb-2">
        Repair Suggestions
      </p>

      {isPro ? (
        <ol className="space-y-5 list-decimal pl-5">
          {suggestions.map((suggestion, idx) => (
            <li key={`${suggestion.problematic_step}-${idx}`} className="space-y-3">
              <div className="space-y-2 mono text-xs">
                <InfoRow label="problematic step" value={suggestion.problematic_step} />
                <InfoRow label="issue" value={suggestion.issue} />
              </div>
              <DiffView
                before={suggestion.problematic_step}
                after={suggestion.revised_step}
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden border border-border/80 bg-bg/60 p-4">
            <div className="mono text-xs space-y-2 blur-[3px] select-none pointer-events-none">
              <InfoRow label="problematic step" value={suggestions[0].problematic_step} />
              <InfoRow label="issue" value={suggestions[0].issue} />
              <DiffView before={suggestions[0].problematic_step} after={suggestions[0].revised_step} />
            </div>

            <div className="absolute inset-0 bg-bg/45 flex items-center justify-center">
              <div className="flex items-center gap-2 border border-border bg-bg/90 px-3 py-2 mono text-xs text-text">
                <Lock size={12} />
                <span>Unlock with Pro — see all {suggestions.length} suggestions</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 items-start">
      <span className="text-muted uppercase tracking-wider">{label}</span>
      <span className="text-dim leading-relaxed">{value}</span>
    </div>
  )
}

function DiffView({ before, after }: { before: string; after: string }) {
  return (
    <div className="space-y-2">
      <div className="border border-invalid/30 bg-invalid/10 p-3 mono text-xs">
        <p className="text-invalid mb-1">- before</p>
        <p className="text-dim leading-relaxed">{before}</p>
      </div>
      <div className="border border-valid/30 bg-valid/10 p-3 mono text-xs">
        <p className="text-valid mb-1">+ after</p>
        <p className="text-dim leading-relaxed">{after}</p>
      </div>
    </div>
  )
}
