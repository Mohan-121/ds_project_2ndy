import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { modelsApi } from '../lib/api'
import { formatDateTime, formatRelativeTime, formatNumber } from '../lib/utils'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/ErrorState'
import { ConfirmDialog } from '../components/ui/Modal'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { RefreshCw, AlertCircle } from 'lucide-react'
import useAppStore from '../store/appStore'
import { hasPermission } from '../lib/auth'

const DOMAIN_LABELS = { traffic: 'Traffic', energy: 'Energy', air: 'Air Quality', population: 'Population' }

function ModelCard({ model, onTrain }) {
  const user = useAppStore((s) => s.user)
  const canTrain = hasPermission(user, 'action:train_models')
  const [showConfirm, setShowConfirm] = useState(false)
  const [training, setTraining] = useState(false)

  async function triggerTrain() {
    setTraining(true)
    try { await onTrain(model.id) } finally { setTraining(false) }
  }

  const statusColors = {
    active: 'text-severity-normal',
    candidate: 'text-primary',
    retired: 'text-ink-secondary',
    failed: 'text-severity-critical',
  }

  const metricsNote = model.metrics?.note || (model.metrics?.MAE === null ? 'Not yet evaluated' : null)

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-border-hairline flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink">{model.model_name}</span>
            <span className={`text-xs font-medium ${statusColors[model.status] || ''}`}>{model.status}</span>
          </div>
          <div className="text-[10px] text-ink-secondary mt-0.5">
            {DOMAIN_LABELS[model.domain] || model.domain} · {model.model_type} · {model.version_tag}
          </div>
        </div>
        {canTrain && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={training}
            className="btn-ghost text-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${training ? 'animate-spin' : ''}`} />
            {training ? 'Training…' : 'Trigger training'}
          </button>
        )}
      </div>

      <div className="px-4 py-3 grid grid-cols-2 gap-4">
        <div>
          <p className="field-label mb-1.5">Model metrics (held-out test)</p>
          {metricsNote ? (
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-ink-secondary shrink-0 mt-0.5" />
              <p className="text-xs text-ink-secondary">{metricsNote}</p>
            </div>
          ) : model.metrics ? (
            <div className="space-y-0.5">
              {Object.entries(model.metrics).filter(([k]) => !['note'].includes(k)).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-ink-secondary">{k}</span>
                  <span className="font-mono">{v !== null ? formatNumber(v, 4) : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-secondary italic">Not yet evaluated</p>
          )}
        </div>
        <div>
          <p className="field-label mb-1.5">Baseline metrics (persistence)</p>
          {model.baseline_metrics && Object.keys(model.baseline_metrics).length > 0 ? (
            <div className="space-y-0.5">
              {Object.entries(model.baseline_metrics).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-ink-secondary">{k}</span>
                  <span className="font-mono">{v !== null ? formatNumber(v, 4) : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-secondary italic">Baseline not computed</p>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="field-label mb-1">Feature list</p>
        <div className="flex flex-wrap gap-1">
          {(model.feature_list || []).slice(0, 12).map(f => (
            <span key={f} className="text-[10px] font-mono bg-sunken px-1.5 py-0.5 rounded">{f}</span>
          ))}
          {(model.feature_list || []).length > 12 && (
            <span className="text-[10px] text-ink-secondary">+{model.feature_list.length - 12} more</span>
          )}
          {!model.feature_list?.length && <span className="text-[10px] text-ink-secondary italic">Not defined</span>}
        </div>
      </div>

      <div className="px-4 pb-3 text-[10px] text-ink-secondary font-mono">
        Created: {formatDateTime(model.created_at)}
      </div>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { triggerTrain(); setShowConfirm(false) }}
        title="Trigger model training"
        message={`Start training "${model.model_name}"? The job will run in the background. Training is audited.`}
        confirmLabel="Start training"
      />
    </div>
  )
}

export default function ModelsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['models'],
    queryFn: () => modelsApi.list(),
    refetchInterval: 60_000,
  })

  const models = data?.data || []

  async function handleTrain(id) {
    try { await modelsApi.train(id); refetch() } catch {}
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-base font-semibold text-ink">ML Models — Registry</h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Model versions, training status, metrics vs baseline. Accuracy shown only from stored evaluation runs.
        </p>
      </div>

      <div className="card px-4 py-3 border-l-2 border-l-severity-watch text-xs text-ink-secondary">
        <strong className="text-ink">Evaluation status:</strong> Models require sufficient historical observations for training.
        With demo seed data ({`<`}200 timesteps per segment), full XGBoost training is not possible.
        BPR simulation is used as an honest fallback for forecasts.
        Metrics will show "Not yet evaluated" until real data is ingested and training is triggered.
        Baselines (persistence, seasonal naive) are always computed as a reference.
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : models.length === 0 ? (
        <EmptyState title="No models registered" description="Models are seeded at startup. Run init_db.py or restart the backend." />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {models.map(m => (
            <ModelCard key={m.id} model={m} onTrain={handleTrain} />
          ))}
        </div>
      )}

      <div className="card px-4 py-3 text-xs text-ink-secondary">
        <p className="font-medium text-ink mb-1">Why XGBoost for traffic/energy/air, not LSTM?</p>
        <p>XGBoost is chosen as the primary model because it works well with the tabular feature structure (lags, calendar, weather, road class) and with limited training data.
        LSTM requires substantially more sequential data and GPU training time for comparable performance. LSTM is registered as a candidate model for when sufficient data is available.
        Population uses statistical models (exponential/logistic/linear) because only 3 decennial census data points exist — far below the minimum for any ML model.</p>
        <p className="mt-2 font-medium text-ink">How is data leakage prevented?</p>
        <p>Feature engineering uses only past values (t−1, t−2…). Train/test splits are time-ordered (no shuffle).
        The test window always follows the training window chronologically. Evaluation metrics are computed only on the held-out future period.</p>
      </div>
    </div>
  )
}

