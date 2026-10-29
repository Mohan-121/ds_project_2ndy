import React from 'react'
import { PROVENANCE_TAGS } from '../../lib/constants'

export default function ProvenanceChip({ tag, className = '' }) {
  if (!tag) return null
  const info = PROVENANCE_TAGS[tag?.toUpperCase()] || { label: tag, color: '#5A656D' }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border font-mono text-xs tracking-wide ${className}`}
      style={{ borderColor: info.color, color: info.color, fontSize: '10px' }}
      title={info.description}
    >
      {info.label || tag}
    </span>
  )
}

