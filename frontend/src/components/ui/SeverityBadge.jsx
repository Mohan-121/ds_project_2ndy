import React from 'react'
import { RISK_LEVELS } from '../../lib/constants'

const SEVERITY_MAP = {
  Info: { label: 'Info', bg: 'bg-sunken', text: 'text-ink-secondary', border: 'border-border-hairline' },
  Watch: { label: 'Watch', bg: 'bg-severity-watch-bg', text: 'text-severity-watch', border: 'border-severity-watch' },
  High: { label: 'High', bg: 'bg-severity-high-bg', text: 'text-severity-high', border: 'border-severity-high' },
  Critical: { label: 'Critical', bg: 'bg-severity-critical-bg', text: 'text-severity-critical', border: 'border-severity-critical' },
  Normal: { label: 'Normal', bg: 'bg-severity-normal-bg', text: 'text-severity-normal', border: 'border-severity-normal' },
}

export function SeverityBadge({ level, className = '' }) {
  const info = typeof level === 'number'
    ? RISK_LEVELS[level] || RISK_LEVELS[0]
    : null

  const label = info ? info.label : level
  const style = SEVERITY_MAP[label] || SEVERITY_MAP['Info']

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-xs font-medium ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {label}
    </span>
  )
}

export function StatusDot({ status }) {
  const colors = {
    CONNECTED: 'bg-severity-normal',
    DEMO: 'bg-primary',
    DEGRADED: 'bg-severity-watch',
    FAILED: 'bg-severity-critical',
    'NOT CONFIGURED': 'bg-ink-muted',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors[status] || 'bg-ink-muted'}`} />
      <span className="text-xs text-ink-secondary">{status}</span>
    </span>
  )
}

export default SeverityBadge

