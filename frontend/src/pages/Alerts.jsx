import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { alertsApi } from '../lib/api'
import { formatRelativeTime, formatDateTime } from '../lib/utils'
import ProvenanceChip from '../components/ui/ProvenanceChip'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/ErrorState'
import { ConfirmDialog } from '../components/ui/Modal'
import { CheckCircle, ExternalLink } from 'lucide-react'
import useAppStore from '../store/appStore'
import { hasPermission } from '../lib/auth'

const DOMAINS = ['All', 'traffic', 'energy', 'air', 'quality']
const SEVERITIES = ['All', 'Critical', 'High', 'Watch', 'Info']
const TYPES = ['All', 'THRESHOLD_BREACH', 'PREDICTED_RISK']
const STATUSES = ['open', 'acknowledged', 'resolved']

export default function AlertsPage() {
  const user = useAppStore((s) => s.user)
  const canAck = hasPermission(user, 'action:acknowledge_alerts')
  const [domain, setDomain] = useState('All')
  const [severity, setSeverity] = useState('All')
  const [type, setType] = useState('All')
  const [status, setStatus] = useState('open')
  const [ackTarget, setAckTarget] = useState(null)

  const params = {
    limit: 100,
    ...(domain !== 'All' ? { domain } : {}),
    ...(severity !== 'All' ? { severity } : {}),
    ...(type !== 'All' ? { alert_type: type } : {}),
    status,
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alerts', params],
    queryFn: () => alertsApi.list(params),
    refetchInterval: 30_000,
  })
  const { data: rulesData } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => alertsApi.rules(),
    staleTime: 300_000,
  })

  const alerts = data?.data || []
  const rules = rulesData?.data || []

  async function acknowledge(id) {
    try { await alertsApi.acknowledge(id); refetch() } catch {}
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-base font-semibold text-ink">Alerts</h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Rule-based alerts — THRESHOLD_BREACH (actual observed) vs PREDICTED_RISK (forecast-based). Deduplicated with cooldown.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 card px-3 py-2.5">
        {[
          { label: 'Domain', options: DOMAINS, value: domain, onChange: setDomain },
          { label: 'Severity', options: SEVERITIES, value: severity, onChange: setSeverity },
          { label: 'Type', options: TYPES, value: type, onChange: setType },
          { label: 'Status', options: STATUSES, value: status, onChange: setStatus },
        ].map(({ label, options, value, onChange }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="field-label">{label}:</span>
            <select value={value} onChange={e => onChange(e.target.value)}
              className="px-2 py-1 text-xs border border-border-hairline rounded focus:outline-none focus:border-primary bg-surface">
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <span className="ml-auto text-xs text-ink-secondary">{alerts.length} alerts</span>
      </div>

      {/* Alert list */}
      <div className="card divide-y divide-border-hairline">
        {isLoading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="flex items-start gap-3 px-3 py-3">
              <Skeleton className="h-5 w-16" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
            </div>
          ))
        ) : alerts.length === 0 ? (
          <EmptyState title="No alerts match the current filters" description="Active alert rules are running. Change filters or wait for new observations." />
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="flex items-start gap-3 px-3 py-3 hover:bg-sunken">
              <SeverityBadge level={alert.severity} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-ink">{alert.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                    alert.alert_type === 'PREDICTED_RISK'
                      ? 'border-domain-energy text-domain-energy'
                      : 'border-domain-traffic text-domain-traffic'
                  }`}>
                    {alert.alert_type}
                  </span>
                </div>
                <p className="text-[10px] text-ink-secondary mt-0.5">{alert.description}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[10px] text-ink-secondary capitalize">{alert.domain}</span>
                  <span className="text-[10px] text-ink-secondary">{alert.location_id}</span>
                  <ProvenanceChip tag={alert.provenance} />
                  <span className="text-[10px] font-mono text-ink-secondary">{formatRelativeTime(alert.trigger_time)}</span>
                  {alert.status === 'acknowledged' && (
                    <span className="text-[10px] text-severity-normal">Acknowledged by {alert.acknowledged_by}</span>
                  )}
                </div>
              </div>
              {alert.status === 'open' && canAck && (
                <button
                  onClick={() => setAckTarget(alert)}
                  className="shrink-0 flex items-center gap-1 text-xs text-ink-secondary hover:text-severity-normal btn-ghost"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Acknowledge
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Active rules */}
      <div className="card">
        <div className="px-3 py-2 border-b border-border-hairline"><span className="section-title">Active alert rules</span></div>
        <table>
          <thead>
            <tr className="border-b border-border-hairline">
              <th className="px-3 py-2">Rule</th>
              <th className="px-3 py-2 text-center">Domain</th>
              <th className="px-3 py-2 text-center">Type</th>
              <th className="px-3 py-2 text-center">Severity</th>
              <th className="px-3 py-2">Condition</th>
              <th className="px-3 py-2 text-right">Cooldown</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="data-row">
                <td className="px-3 py-2 text-xs">{r.name}</td>
                <td className="px-3 py-2 text-center text-xs capitalize">{r.domain}</td>
                <td className="px-3 py-2 text-center text-xs">{r.rule_type}</td>
                <td className="px-3 py-2 text-center"><SeverityBadge level={r.severity} /></td>
                <td className="px-3 py-2 font-mono text-[10px] text-ink-secondary">{r.condition_expr}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{r.cooldown_minutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!ackTarget}
        onClose={() => setAckTarget(null)}
        onConfirm={() => { acknowledge(ackTarget?.id); setAckTarget(null) }}
        title="Acknowledge alert"
        message={`Acknowledge "${ackTarget?.title}"? This will record your username and the time.`}
        confirmLabel="Acknowledge"
      />
    </div>
  )
}

