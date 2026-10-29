import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import useAppStore from './store/appStore'
import { getAccessToken, isTokenExpired, getStoredUser } from './lib/auth'
import AppShell from './components/layout/AppShell'

// Lazy-load pages for performance
import LoginPage from './pages/LoginPage'
import CommandCenter from './pages/CommandCenter'
import DigitalTwin from './pages/DigitalTwin'
import TrafficPage from './pages/Traffic'
import EnergyPage from './pages/Energy'
import EnvironmentPage from './pages/Environment'
import PopulationPage from './pages/Population'
import ScenariosPage from './pages/Scenarios'
import AssistantPage from './pages/Assistant'
import DataQualityPage from './pages/DataQuality'
import ModelsPage from './pages/Models'
import AlertsPage from './pages/Alerts'
import ReportsPage from './pages/Reports'
import SettingsPage from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function AuthGuard({ children }) {
  const token = getAccessToken()
  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    const token = getAccessToken()
    if (token && !isTokenExpired(token)) {
      const stored = getStoredUser()
      if (stored) setUser(stored)
    }
  }, [setUser])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <AppShell />
              </AuthGuard>
            }
          >
            <Route index element={<Navigate to="/command-center" replace />} />
            <Route path="command-center" element={<CommandCenter />} />
            <Route path="digital-twin" element={<DigitalTwin />} />
            <Route path="traffic" element={<TrafficPage />} />
            <Route path="energy" element={<EnergyPage />} />
            <Route path="environment" element={<EnvironmentPage />} />
            <Route path="population" element={<PopulationPage />} />
            <Route path="scenarios" element={<ScenariosPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="data-quality" element={<DataQualityPage />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/command-center" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

