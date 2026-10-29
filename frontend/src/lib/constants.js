// Application-wide constants

export const HORIZONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
]

export const ENERGY_HORIZONS = [
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' },
]

export const AIR_HORIZONS = [
  { value: 60, label: '1 hour' },
  { value: 180, label: '3 hours' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' },
]

export const DATA_MODES = [
  { value: 'LIVE', label: 'Live', description: 'Real data from connected sources only' },
  { value: 'HISTORICAL', label: 'Historical', description: 'Real historical datasets' },
  { value: 'DEMO', label: 'Demo', description: 'Reproducible simulated data' },
]

export const DOMAINS = [
  { id: 'traffic', label: 'Traffic', color: '#3F5F7F', bgColor: '#EEF3F8' },
  { id: 'energy', label: 'Energy', color: '#9A7415', bgColor: '#FAF5EB' },
  { id: 'air', label: 'Environment', color: '#2F7F6D', bgColor: '#EAF6F3' },
  { id: 'population', label: 'Population', color: '#7B5368', bgColor: '#F7EFF3' },
]

export const SEVERITY_LEVELS = [
  { value: 'Info', label: 'Info', color: '#5A656D' },
  { value: 'Watch', label: 'Watch', color: '#B7791F' },
  { value: 'High', label: 'High', color: '#C4511A' },
  { value: 'Critical', label: 'Critical', color: '#A3202F' },
]

export const RISK_LEVELS = [
  { value: 0, label: 'Normal', color: '#2E7D53' },
  { value: 1, label: 'Watch', color: '#B7791F' },
  { value: 2, label: 'High', color: '#C4511A' },
  { value: 3, label: 'Critical', color: '#A3202F' },
]

export const PROVENANCE_TAGS = {
  OBSERVED: { label: 'Observed', color: '#2E7D53', description: 'Measured by a real source' },
  MODELLED: { label: 'Modelled', color: '#17606E', description: 'Output of an external model/reanalysis' },
  FORECAST: { label: 'Forecast', color: '#9A7415', description: 'Produced by a UrbanIQ model' },
  ESTIMATED: { label: 'Estimated', color: '#5A656D', description: 'Derived by documented calculation' },
  REFERENCE: { label: 'Reference', color: '#3F5F7F', description: 'Manually entered reference value' },
  SIMULATED: { label: 'Simulated', color: '#B7791F', description: 'Synthetic demo data' },
}

export const CONGESTION_CLASSES = {
  free: { label: 'Free flow', color: '#2E7D53' },
  moderate: { label: 'Moderate', color: '#B7791F' },
  heavy: { label: 'Heavy', color: '#C4511A' },
  severe: { label: 'Severe', color: '#A3202F' },
}

export const AQI_CATEGORIES = {
  Good: { color: '#2E7D53', range: '0–50' },
  Satisfactory: { color: '#9A7415', range: '51–100' },
  Moderate: { color: '#B7791F', range: '101–200' },
  Poor: { color: '#C4511A', range: '201–300' },
  'Very Poor': { color: '#A3202F', range: '301–400' },
  Severe: { color: '#6B0F1A', range: '401+' },
}

export const NAV_ITEMS = [
  { path: '/command-center', label: 'Command Center', icon: 'LayoutDashboard' },
  { path: '/digital-twin', label: 'Digital Twin', icon: 'Globe' },
  { path: '/traffic', label: 'Traffic', icon: 'Car' },
  { path: '/energy', label: 'Energy', icon: 'Zap' },
  { path: '/environment', label: 'Environment', icon: 'Wind' },
  { path: '/population', label: 'Population', icon: 'Users' },
  { path: '/scenarios', label: 'Scenarios', icon: 'FlaskConical' },
  { path: '/assistant', label: 'Assistant', icon: 'MessageSquare' },
  { path: '/data-quality', label: 'Data & Quality', icon: 'Database' },
  { path: '/models', label: 'Models', icon: 'BrainCircuit' },
  { path: '/alerts', label: 'Alerts', icon: 'Bell' },
  { path: '/reports', label: 'Reports', icon: 'FileText' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
]

export const COIMBATORE_CENTER = [76.9558, 11.0168]
export const COIMBATORE_ZONES = ['Gandhipuram', 'Peelamedu', 'Singanallur', 'Saravanampatti', 'Ukkadam', 'RS Puram', 'Vadavalli']

export const PERMISSIONS = {
  VIEW_DASHBOARDS: 'view:dashboards',
  VIEW_TRAFFIC: 'view:traffic',
  VIEW_ENERGY: 'view:energy',
  VIEW_AIR: 'view:air',
  VIEW_POPULATION: 'view:population',
  IMPORT_DATA: 'action:import_data',
  CONFIGURE_SOURCES: 'action:configure_sources',
  TRAIN_MODELS: 'action:train_models',
  EDIT_THRESHOLDS: 'action:edit_thresholds',
  MANAGE_SCENARIOS: 'action:manage_scenarios',
  ACKNOWLEDGE_ALERTS: 'action:acknowledge_alerts',
  GENERATE_REPORTS: 'action:generate_reports',
  MANAGE_USERS: 'admin:manage_users',
}
