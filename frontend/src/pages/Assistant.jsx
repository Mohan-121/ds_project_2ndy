import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { assistantApi } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import ProvenanceChip from '../components/ui/ProvenanceChip'
import { Skeleton } from '../components/ui/Skeleton'
import { Send, ChevronDown, ChevronRight, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react'

const EXAMPLE_QUERIES = [
  'What is the current traffic congestion situation on Avinashi Road?',
  'Where are the worst air quality hotspots in Coimbatore right now?',
  'How does energy demand compare to installed capacity in the Central zone?',
  'What does the population projection show for 2031?',
  'Which wards currently have the most overlapping risks?',
]

function EvidenceBlock({ evidence }) {
  const [open, setOpen] = useState(false)
  if (!evidence) return null
  return (
    <div className="mt-3 border border-border-hairline rounded bg-sunken">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-secondary hover:text-ink"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Evidence block
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border-hairline">
          {evidence.tools_called?.length > 0 && (
            <div>
              <span className="field-label">Tools called</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {evidence.tools_called.map((t, i) => (
                  <span key={i} className="bg-surface border border-border-hairline px-1.5 py-0.5 rounded font-mono text-[10px]">{t}</span>
                ))}
              </div>
            </div>
          )}
          {evidence.data_sources?.length > 0 && (
            <div>
              <span className="field-label">Data sources</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {evidence.data_sources.map((s, i) => (
                  <span key={i} className="text-[10px] text-ink-secondary">{s}</span>
                ))}
              </div>
            </div>
          )}
          {evidence.provenance_tags?.length > 0 && (
            <div>
              <span className="field-label">Provenance</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {evidence.provenance_tags.map((t, i) => <ProvenanceChip key={i} tag={t} />)}
              </div>
            </div>
          )}
          {evidence.timestamps && (
            <div>
              <span className="field-label">Data as of</span>
              <div className="text-[10px] font-mono text-ink-secondary mt-1">{JSON.stringify(evidence.timestamps)}</div>
            </div>
          )}
          {evidence.model_versions?.length > 0 && (
            <div>
              <span className="field-label">Models</span>
              <div className="text-[10px] text-ink-secondary mt-1">{evidence.model_versions.join(', ')}</div>
            </div>
          )}
          {evidence.limitations && (
            <div>
              <span className="field-label">Known limitations</span>
              <p className="text-[10px] text-ink-secondary mt-1 leading-relaxed">{evidence.limitations}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AnswerMessage({ question, answer, evidence, suggestedActions, timestamp }) {
  return (
    <div className="border border-border-hairline rounded bg-surface p-4 space-y-3">
      {/* Question */}
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded bg-sunken text-ink-secondary flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5">Q</div>
        <p className="text-sm text-ink font-medium leading-relaxed">{question}</p>
      </div>

      {/* Answer */}
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded bg-primary text-white flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5">A</div>
        <div className="flex-1">
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
      </div>

      {/* Evidence */}
      <EvidenceBlock evidence={evidence} />

      {/* Suggested actions */}
      {suggestedActions?.length > 0 && (
        <div>
          <p className="field-label mb-1.5">Suggested actions</p>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action, i) => (
              <button key={i} className="btn-ghost text-xs">
                {action.label || action}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-secondary mt-1">Actions shown as proposals — not auto-executed. Click to navigate or review.</p>
        </div>
      )}

      <div className="text-[10px] text-ink-secondary font-mono">{formatDateTime(timestamp)}</div>
    </div>
  )
}

export default function AssistantPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')

  const { data: statusData } = useQuery({
    queryKey: ['assistant-status'],
    queryFn: () => assistantApi.status(),
    staleTime: 60_000,
  })

  const geminiStatus = statusData?.data || {}

  async function submitQuery() {
    const q = query.trim()
    if (!q) return
    setLoading(true); setError('')
    try {
      const res = await assistantApi.query({ question: q })
      const result = res.data || res
      setMessages(prev => [
        {
          question: q,
          answer: result.answer,
          evidence: result.evidence,
          suggestedActions: result.suggested_actions || [],
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ])
      setQuery('')
    } catch (e) {
      setError(e.message || 'Query failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-base font-semibold text-ink">Urban Planning Assistant</h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Data-grounded queries about Coimbatore conditions. All answers cite their data sources, provenance, and limitations.
            No invented facts.
          </p>
        </div>

        {/* Gemini API Status Badge */}
        <div className="shrink-0 flex items-center gap-2">
          {geminiStatus.status === 'CONNECTED' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold">Gemini LLM Active</span>
              <span className="text-[10px] text-emerald-600 font-mono">3.8-Flash</span>
            </div>
          ) : geminiStatus.status === 'PERMISSION_DENIED' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs" title={geminiStatus.error_detail}>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold">Gemini Key: Billing Required</span>
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Local Grounded Facts Engine Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface border border-border-hairline text-ink-secondary text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Offline Fact Engine Active</span>
            </div>
          )}
        </div>
      </div>

      {geminiStatus.status === 'PERMISSION_DENIED' && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold text-amber-800 mb-0.5">Google Cloud Project Notice for Configured GEMINI_API_KEY:</p>
          <p className="text-[11px] text-amber-700">{geminiStatus.error_detail || 'Google Cloud returned 403: Free tier is disabled for this project. Enable billing at https://aistudio.google.com/billing or generate a free tier API key at https://aistudio.google.com/apikey.'}</p>
          <p className="text-[11px] font-medium text-emerald-800 mt-1">UrbanIQ automatically falls back to the local deterministic fact verification engine with zero downtime.</p>
        </div>
      )}

      {/* Query console */}
      <div className="card p-4">
        <label className="field-label block mb-2">Query</label>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitQuery() } }}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-border-hairline rounded bg-surface text-ink focus:outline-none focus:border-primary resize-none font-sans"
          placeholder="Ask a question about Coimbatore urban conditions, traffic, air quality, energy demand, or population…"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_QUERIES.slice(0, 3).map((q, i) => (
              <button key={i} onClick={() => setQuery(q)} className="text-[10px] px-2 py-1 rounded border border-border-hairline text-ink-secondary hover:text-ink hover:bg-sunken">
                {q.length > 50 ? q.slice(0, 47) + '…' : q}
              </button>
            ))}
          </div>
          <button
            onClick={submitQuery}
            disabled={!query.trim() || loading}
            className="btn-primary text-sm gap-1.5 ml-3 shrink-0 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Querying…' : 'Query'}
          </button>
        </div>
        {error && <p className="text-xs text-severity-critical mt-2">{error}</p>}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading && (
          <div className="card p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        {messages.map((m, i) => (
          <AnswerMessage key={i} {...m} />
        ))}
        {messages.length === 0 && !loading && (
          <div className="text-center py-12 text-ink-secondary">
            <p className="text-sm">No queries yet.</p>
            <p className="text-xs mt-1">
              The assistant uses the same internal data tools as the dashboards. Answers include an evidence block
              showing which tools were called, data sources, provenance tags, and known limitations.
            </p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-ink-secondary shrink-0">
        Gemini API: {import.meta.env.VITE_GEMINI_CONFIGURED === 'true' ? 'Configured' : 'Not configured — using structured query fallback.'} ·
        Sessions are logged without storing secrets. Out-of-scope questions (disaster, signal control) are declined.
      </p>
    </div>
  )
}

