interface ReasoningDiffProps {
  original: string
  repaired: string
}

export default function ReasoningDiff({ original, repaired }: ReasoningDiffProps) {
  const originalLines = original.split('\n')
  const repairedLines = repaired.split('\n')
  const maxLen = Math.max(originalLines.length, repairedLines.length)

  return (
    <div className="border border-border bg-surface/20 p-4 space-y-1">
      {Array.from({ length: maxLen }).map((_, idx) => {
        const prev = originalLines[idx]
        const next = repairedLines[idx]

        if (prev === undefined && next !== undefined) {
          return (
            <p key={`add-${idx}`} className="mono text-xs text-valid">
              + {next}
            </p>
          )
        }

        if (prev !== undefined && next === undefined) {
          return (
            <p key={`rem-${idx}`} className="mono text-xs text-invalid line-through">
              - {prev}
            </p>
          )
        }

        if (prev !== next) {
          return (
            <div key={`chg-${idx}`} className="space-y-1">
              <p className="mono text-xs text-invalid line-through">- {prev}</p>
              <p className="mono text-xs text-valid">+ {next}</p>
            </div>
          )
        }

        return (
          <p key={`same-${idx}`} className="mono text-xs text-dim">
            {prev}
          </p>
        )
      })}
    </div>
  )
}
