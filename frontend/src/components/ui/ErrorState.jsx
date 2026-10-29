import React from 'react'
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'

export function ErrorState({ message, onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}>
      <AlertCircle className="w-8 h-8 text-severity-high" />
      <div>
        <p className="text-sm font-medium text-ink">Unable to load data</p>
        <p className="text-xs text-ink-secondary mt-1 max-w-xs">{message || 'An unexpected error occurred.'}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-ghost flex items-center gap-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}>
      <WifiOff className="w-8 h-8 text-ink-muted" />
      <div>
        <p className="text-sm font-medium text-ink">{title || 'No data available'}</p>
        {description && (
          <p className="text-xs text-ink-secondary mt-1 max-w-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export default ErrorState

