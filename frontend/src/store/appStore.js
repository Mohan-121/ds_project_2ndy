import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),

      // Data mode: LIVE | HISTORICAL | DEMO
      dataMode: 'DEMO',
      setDataMode: (mode) => set({ dataMode: mode }),

      // Selected time (null = now)
      selectedTime: null,
      setSelectedTime: (t) => set({ selectedTime: t }),

      // Selected forecast horizon (minutes)
      selectedHorizon: 30,
      setSelectedHorizon: (h) => set({ selectedHorizon: h }),

      // Selected location on map
      selectedLocation: null,
      setSelectedLocation: (loc) => set({ selectedLocation: loc }),
      clearSelectedLocation: () => set({ selectedLocation: null }),

      // Active alerts count
      alertsCount: 0,
      setAlertsCount: (n) => set({ alertsCount: n }),

      // Alerts list (recent)
      alerts: [],
      setAlerts: (alerts) => set({ alerts }),
      addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 50) })),

      // Inspector panel open/closed
      inspectorOpen: false,
      setInspectorOpen: (v) => set({ inspectorOpen: v }),

      // Nav sidebar collapsed
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    {
      name: 'urbaniq-store',
      partialize: (state) => ({
        dataMode: state.dataMode,
        selectedHorizon: state.selectedHorizon,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)

export default useAppStore

