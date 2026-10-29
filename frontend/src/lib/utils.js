// Date, number, and provenance utilities

const IST_TIMEZONE = 'Asia/Kolkata'

// Format a date/timestamp in IST
export function formatIST(date, options = {}) {
  if (!date) return '—'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  const defaultOptions = {
    timeZone: IST_TIMEZONE,
    ...options,
  }
  
  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(d)
}

// Format date only
export function formatDate(date) {
  return formatIST(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Format time only
export function formatTime(date) {
  return formatIST(date, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// Format date + time
export function formatDateTime(date) {
  return formatIST(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// Format relative time (e.g., "3 min ago")
export function formatRelativeTime(date) {
  if (!date) return '—'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  const diffMs = Date.now() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return `${diffDay}d ago`
}

// Format a number with fixed decimals
export function formatNumber(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return Number(value).toFixed(decimals)
}

// Format large numbers (e.g., 1500000 → 1.5 M)
export function formatLargeNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const n = Number(value)
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)} B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)} M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)} K`
  return n.toFixed(1)
}

// Format percentage
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return `${Number(value).toFixed(decimals)}%`
}

// Format delta (with sign)
export function formatDelta(value, decimals = 1, unit = '') {
  if (value === null || value === undefined || isNaN(value)) return null
  const n = Number(value)
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(decimals)}${unit}`
}

// Get AQI category
export function getAQICategory(aqi) {
  if (aqi <= 50) return { label: 'Good', color: '#2E7D53' }
  if (aqi <= 100) return { label: 'Satisfactory', color: '#9A7415' }
  if (aqi <= 200) return { label: 'Moderate', color: '#B7791F' }
  if (aqi <= 300) return { label: 'Poor', color: '#C4511A' }
  if (aqi <= 400) return { label: 'Very poor', color: '#A3202F' }
  return { label: 'Severe', color: '#6B0F1A' }
}

// Get congestion label
export function getCongestionLabel(level) {
  const map = {
    free: 'Free flow',
    moderate: 'Moderate',
    heavy: 'Heavy',
    severe: 'Severe',
  }
  return map[level] || level || '—'
}

// Clamp a value between min and max
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

// Generate provenance label from data
export function getProvenance(item) {
  if (!item) return 'OBSERVED'
  if (item.provenance) return item.provenance.toUpperCase()
  if (item.source === 'forecast') return 'FORECAST'
  if (item.source === 'model') return 'MODELLED'
  if (item.is_simulated) return 'SIMULATED'
  return 'OBSERVED'
}

// Convert API timestamp series to chart-ready format
export function toChartData(series, xKey = 'timestamp', yKeys = ['value']) {
  if (!Array.isArray(series)) return []
  return series.map(item => {
    const point = { [xKey]: new Date(item[xKey] || item.timestamp).getTime() }
    yKeys.forEach(k => {
      point[k] = item[k] !== undefined ? item[k] : item.value
    })
    return point
  })
}

// Merge observed + forecast series for charts
export function mergeObservedForecast(observed, forecast) {
  const obs = (observed || []).map(d => ({
    ...d,
    t: new Date(d.timestamp).getTime(),
    type: 'observed',
  }))
  const fct = (forecast || []).map(d => ({
    ...d,
    t: new Date(d.timestamp).getTime(),
    type: 'forecast',
  }))
  return [...obs, ...fct].sort((a, b) => a.t - b.t)
}

// Truncate text
export function truncate(str, n = 60) {
  if (!str) return ''
  return str.length > n ? `${str.slice(0, n)}…` : str
}
