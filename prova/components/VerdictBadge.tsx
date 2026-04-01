'use client'

/**
 * components/VerdictBadge.tsx
 *
 * The single most important element in Prova's UI.
 * VALID → green glow. INVALID → red glow.
 * Feels like a courtroom verdict.
 */

import clsx from 'clsx'

interface Props {
  verdict: 'VALID' | 'INVALID'
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}

export default function VerdictBadge({ verdict, size = 'md', animate = true }: Props) {
  const isValid = verdict === 'VALID'

  const sizeClasses = {
    sm: 'text-sm tracking-widest',
    md: 'text-2xl tracking-widest',
    lg: 'text-5xl tracking-widest',
  }

  return (
    <div
      className={clsx(
        'font-mono font-bold inline-flex items-center gap-3',
        sizeClasses[size],
        isValid ? 'verdict-valid' : 'verdict-invalid',
        animate && isValid  && 'animate-pulse-valid',
        animate && !isValid && 'animate-pulse-invalid',
      )}
    >
      <span className={clsx(
        'inline-flex items-center justify-center rounded-full border-2 shrink-0',
        size === 'lg' ? 'w-10 h-10 text-xl' : size === 'md' ? 'w-7 h-7 text-sm' : 'w-5 h-5 text-xs',
        isValid
          ? 'border-valid text-valid'
          : 'border-invalid text-invalid',
      )}>
        {isValid ? '✓' : '✗'}
      </span>
      {verdict}
    </div>
  )
}
