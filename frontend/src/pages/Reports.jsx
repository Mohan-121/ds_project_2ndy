import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../lib/api'
import { formatDateTime, formatRelativeTime } from '../lib/utils'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/ErrorState'
import { FileText, Download } from 'lucide-react'
import useAppStore from '../store/appStore'
import { hasPermission } from '../lib/auth'

const REPORT_TYPES = [
  { value: 'daily_conditions', label: 'Daily Urban Conditions' },
  { value: 'traffic_analysis', label: 'Traffic Analysis' },
  { value: 'energy_forecast', label: 'Energy Forecast' },
  { value: 'air_quality', label: 'Air Quality Trends' },
  { value: 'population_growth', label: 'Population Growth' },
  { value: 'risk_assessment', label: 'Multi-Domain Risk Assessment' },
  { value: 'data_quality', label: 'Data Quality Report' },
  { value: 'model_evaluation', label: 'Model Evaluation Report' },
]

const DOMAINS = ['all', 'traffic', 'energy', 'air', 'population']

export default function ReportsPage() {
  const user = useAppStore((s) => s.user)
  const canGenerate = hasPermission(user, 'action:generate_reports')
  const [reportType, setReportType] = useState('daily_conditions')
  const [domain, setDomain] = useState('all')
  const [format, setFormat] = useState('json')
  const [generating, setGenerating] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [error, setError] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list(),
    staleTime: 60_000,
  })

  const reports = data?.data || []

  async function generateReport() {
    setGenerating(true); setError('')
    try {
      const res = await reportsApi.generate({
        report_type: reportType,
        domain: domain !== 'all' ? domain : undefined,
        format,
        date_range_start: new Date(Date.now() - 24 * 3600_000).toISOString(),
        date_range_end: new Date().toISOString(),
      })
      setLastResult(res.data || res)
      refetch()
    } catch (e) {
      setError(e.message || 'Report generation failed')
    } finally { setGenerating(false) }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-base font-semibold text-ink">Reports</h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Generate domain reports in JSON, CSV, or PDF. All reports include provenance tags, timestamps, and a SIMULATED DATA banner when demo data is included.
        </p>
      </div>

      {/* Builder */}
      <div className="card p-4">
        <div className="section-title mb-3">Generate report</div>
        {!canGenerate && (
          <div className="text-xs text-severity-watch bg-severity-watch-bg px-3 py-2 rounded border border-severity-watch mb-3">
            Your role does not have permission to generate reports.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="field-label block mb-1">Report type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-border-hairline rounded bg-surface focus:outline-none focus:border-primary">
              {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label block mb-1">Domain</label>
            <select value={domain} onChange={e => setDomain(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-border-hairline rounded bg-surface focus:outline-none focus:border-primary">
              {DOMAINS.map(d => <option key={d} value={d}>{d === 'all' ? 'All domains' : d}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label block mb-1">Output format</label>
            <select value={format} onChange={e => setFormat(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-border-hairline rounded bg-surface focus:outline-none focus:border-primary">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-severity-critical mb-2">{error}</p>}
        <button
          onClick={generateReport}
          disabled={!canGenerate || generating}
          className="btn-primary text-sm gap-1.5 disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          {generating ? 'Generating…' : 'Generate report'}
        </button>
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="card">
          <div className="px-3 py-2 border-b border-border-hairline flex items-center gap-2">
            <span className="section-title">Generated report</span>
            {lastResult.is_simulated && (
              <span className="text-[10px] px-1.5 py-0.5 bg-severity-watch-bg border border-severity-watch text-severity-watch rounded font-medium">
                SIMULATED DATA
              </span>
            )}
          </div>
          <div className="p-3">
            <div className="text-xs text-ink-secondary mb-2">
              <span className="font-medium text-ink">{lastResult.title}</span> · {formatDateTime(lastResult.generated_at || new Date())}
            </div>
            <pre className="text-[10px] font-mono bg-sunken p-3 rounded overflow-auto max-h-64 text-ink-secondary">
              {JSON.stringify(lastResult.summary || lastResult, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Reports list */}
      <div className="card">
        <div className="px-3 py-2 border-b border-border-hairline"><span className="section-title">Generated reports</span></div>
        {isLoading ? (
          <div className="p-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : reports.length === 0 ? (
          <EmptyState title="No reports generated yet" description="Use the builder above to generate your first report." />
        ) : (
          <table>
            <thead>
              <tr className="border-b border-border-hairline">
                <th className="px-3 py-2">Report</th>
                <th className="px-3 py-2 text-center">Domain</th>
                <th className="px-3 py-2 text-center">Simulated</th>
                <th className="px-3 py-2">Generated by</th>
                <th className="px-3 py-2 text-right">When</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="data-row">
                  <td className="px-3 py-2">
                    <div className="text-xs font-medium text-ink">{r.title}</div>
                    <div className="text-[10px] text-ink-secondary">{r.report_type}</div>
                  </td>
                  <td className="px-3 py-2 text-center text-xs capitalize">{r.domain || 'all'}</td>
                  <td className="px-3 py-2 text-center">
                    {r.is_simulated ? (
                      <span className="text-[10px] text-severity-watch font-medium">SIMULATED</span>
                    ) : (
                      <span className="text-[10px] text-ink-secondary">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.generated_by}</td>
                  <td className="px-3 py-2 text-right font-mono text-[10px] text-ink-secondary">{formatRelativeTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

