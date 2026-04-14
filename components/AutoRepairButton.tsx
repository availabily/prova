'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface AutoRepairButtonProps {
  certId: string
}

const LOADING_STATES = [
  'analyzing failures…',
  'applying fixes…',
  're-verifying…',
] as const

export default function AutoRepairButton({ certId }: AutoRepairButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [phase, setPhase] = useState(0)

  const label = useMemo(() => {
    if (!isLoading) return '⚡ Auto-repair reasoning'
    return LOADING_STATES[Math.min(phase, LOADING_STATES.length - 1)]
  }, [isLoading, phase])

  async function onClick() {
    if (isLoading) return
    setIsLoading(true)
    setPhase(0)

    const timer = window.setInterval(() => {
      setPhase((prev) => Math.min(prev + 1, LOADING_STATES.length - 1))
    }, 900)

    try {
      const res = await fetch(`/api/certificate/${certId}/repair`, {
        method: 'POST',
      })
      const payload = await res.json().catch(() => null)

      if (!res.ok || !payload?.new_certificate_id) {
        throw new Error('Repair failed')
      }

      router.push(`/certificate/${payload.new_certificate_id}?from=${certId}`)
    } finally {
      window.clearInterval(timer)
      setIsLoading(false)
      setPhase(0)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="inline-flex mono text-xs border border-valid/40 text-valid px-4 py-2 hover:border-valid transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}
