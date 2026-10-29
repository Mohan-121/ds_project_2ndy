import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth.js'

const BASE_URL = '/api/v1'

let isRefreshing = false
let refreshQueue = []

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  refreshQueue = []
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')
  
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  
  if (!response.ok) throw new Error('Refresh failed')
  
  const data = await response.json()
  setTokens(data.access_token, data.refresh_token)
  return data.access_token
}

async function request(path, options = {}) {
  const token = getAccessToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })
  
  // Handle 401 with token refresh
  if (response.status === 401 && token) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then(newToken => {
        return request(path, {
          ...options,
          headers: { ...headers, Authorization: `Bearer ${newToken}` },
        })
      })
    }
    
    isRefreshing = true
    
    try {
      const newToken = await refreshAccessToken()
      processQueue(null, newToken)
      isRefreshing = false
      return request(path, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      })
    } catch (err) {
      processQueue(err)
      isRefreshing = false
      clearTokens()
      window.location.href = '/login'
      throw err
    }
  }
  
  if (response.status === 403) {
    throw new ApiError('Permission denied', 403)
  }
  
  if (!response.ok) {
    let message = `Request failed: ${response.status}`
    try {
      const errorData = await response.json()
      message = errorData.detail || errorData.message || message
    } catch {}
    throw new ApiError(message, response.status)
  }
  
  // Handle empty responses
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    return { data: null, meta: {} }
  }
  
  const json = await response.json()
  
  // Unwrap envelope if present
  if (json && typeof json === 'object' && ('data' in json || 'meta' in json)) {
    return json
  }
  
  return { data: json, meta: {} }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// API methods
export const api = {
  get: (path, params) => {
    const url = params
      ? `${path}?${new URLSearchParams(params).toString()}`
      : path
    return request(url, { method: 'GET' })
  },
  
  post: (path, body) => request(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  }),
  
  put: (path, body) => request(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  }),
  
  delete: (path) => request(path, { method: 'DELETE' }),
}

// Auth endpoints
export const authApi = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  demoAccounts: () => api.get('/auth/demo-accounts'),
}

// Health
export const healthApi = {
  health: () => api.get('/health'),
  sources: () => api.get('/sources/health'),
}

// Traffic
export const trafficApi = {
  segments: () => api.get('/traffic/segments'),
  latest: () => api.get('/traffic/latest'),
  hotspots: () => api.get('/traffic/hotspots'),
  forecast: (segmentId, horizonMinutes) =>
    api.get('/traffic/forecast', { segment_id: segmentId, horizon_minutes: horizonMinutes }),
  history: (segmentId) => api.get(`/traffic/history/${segmentId}`),
  tomtomStatus: () => api.get('/traffic/tomtom/status'),
  tomtomSync: (apiKey) => api.post('/traffic/tomtom/sync', { api_key: apiKey }),
  timeline: (hourOffset) => api.get('/traffic/timeline', { hour_offset: hourOffset }),
}

// Energy
export const energyApi = {
  latest: () => api.get('/energy/latest'),
  forecast: (zoneId, horizonMinutes) =>
    api.get('/energy/forecast', { zone_id: zoneId, horizon_minutes: horizonMinutes }),
  zones: () => api.get('/energy/zones'),
  capacity: () => api.get('/energy/capacity'),
}

// Air quality
export const airApi = {
  latest: () => api.get('/air/latest'),
  forecast: (stationId, horizonMinutes) =>
    api.get('/air/forecast', { station_id: stationId, horizon_minutes: horizonMinutes }),
  stations: () => api.get('/air/stations'),
  hotspots: () => api.get('/air/hotspots'),
  weather: () => api.get('/air/weather'),
}

// Population
export const populationApi = {
  history: (entityId) => api.get('/population/history', { entity_id: entityId }),
  projection: (entityId) => api.get('/population/projection', { entity_id: entityId }),
  summary: () => api.get('/population/summary'),
  wards: () => api.get('/population/wards'),
}

// Unified
export const unifiedApi = {
  risk: () => api.get('/unified/risk'),
  cityStatus: () => api.get('/unified/city-status'),
  crossDomain: () => api.get('/unified/cross-domain'),
}

// Scenarios
export const scenariosApi = {
  list: () => api.get('/scenarios'),
  create: (body) => api.post('/scenarios', body),
  get: (id) => api.get(`/scenarios/${id}`),
  run: (id) => api.post(`/scenarios/${id}/run`),
  results: (id) => api.get(`/scenarios/${id}/results`),
  delete: (id) => api.delete(`/scenarios/${id}`),
  presets: () => api.get('/scenarios/presets'),
}

// Alerts
export const alertsApi = {
  list: (params) => api.get('/alerts', params),
  acknowledge: (id) => api.post(`/alerts/${id}/acknowledge`),
  rules: () => api.get('/alerts/rules'),
}

// Reports
export const reportsApi = {
  list: () => api.get('/reports'),
  generate: (body) => api.post('/reports/generate', body),
}

// Models
export const modelsApi = {
  list: () => api.get('/models'),
  train: (id) => api.post(`/models/${id}/train`),
}

// Sources & Live Ingestion
export const sourcesApi = {
  health: () => api.get('/sources/health'),
  liveSync: () => api.post('/sources/live-sync'),
  retry: (id) => api.post(`/sources/${id}/retry`),
  rejectedRecords: (limit) => api.get('/sources/rejected-records', { limit }),
}

// Assistant
export const assistantApi = {
  query: (body) => api.post('/assistant/query', body),
  sessions: () => api.get('/assistant/sessions'),
  status: () => api.get('/assistant/status'),
}

export default api
