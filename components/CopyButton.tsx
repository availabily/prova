'use client'

import { useState } from 'react'

interface Props {
  value: string
  label?: string
  successLabel?: string
}

export default function CopyButton({ value, label = 'copy', successLabel = 'copied!' }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="mono text-xs border border-border px-4 py-2 hover:border-muted transition-colors text-dim hover:text-text"
    >
      {copied ? successLabel : label}
    </button>
  )
}
