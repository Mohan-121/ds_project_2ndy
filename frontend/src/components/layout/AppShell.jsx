import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import TopBar from './TopBar'
import useAppStore from '../../store/appStore'

export default function AppShell() {
  const dataMode = useAppStore((s) => s.dataMode)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-canvas">
      {/* Demo banner */}
      {dataMode === 'DEMO' && (
        <div className="bg-severity-watch-bg border-b border-severity-watch text-severity-watch text-xs px-4 py-1.5 text-center font-medium shrink-0">
          Demo mode — displaying simulated data tagged SIMULATED. Conditions shown are not current Coimbatore conditions.
        </div>
      )}

      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto bg-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

