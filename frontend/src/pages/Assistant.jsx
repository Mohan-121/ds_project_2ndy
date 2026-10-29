import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { assistantApi } from '../lib/api'
import { formatDateTime } from '../lib/utils'
import ProvenanceChip from '../components/ui/ProvenanceChip'
import { Skeleton } from '../components/ui/Skeleton'
import {
  Send,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Bot,
  User as UserIcon,
  ExternalLink,
} from 'lucide-react'

const EXAMPLE_QUERIES = [
  'What is the current traffic congestion situation on Avinashi Road?',
  'Where are the worst air quality hotspots in Coimbatore right now?',
  'How does energy demand compare to installed capacity in the Central zone?',
  'What does the population projection show for 2031?',
  'Which wards currently have the most overlapping risks?',
  'Give me an operational summary of the Coimbatore Municipal Corporation today.',
]

/**
 * Lightweight, robust renderer for AI responses formatted in Markdown.
 * Supports headers (###, ####), bullet points (* or -), bold (**text**), and numbered lists.
 */
function FormattedAnswer({ text }) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []

  let inList = false
  let listItems = []

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 text-ink">
          {listItems.map((li, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              {renderInline(li)}
            </li>
          ))}
        </ul>
      )
      listItems = []
      inList = false
    }
  }

  const renderInline = (str) => {
    // Replace **bold**
    const parts = str.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
      }
      // Replace `code`
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1 py-0.5 rounded bg-sunken text-xs font-mono text-primary">{part.slice(1, -1)}</code>
      }
      return part
    })
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      return
    }

    if (trimmed.startsWith('#### ')) {
      flushList()
      elements.push(
        <h5 key={index} className="text-xs font-bold text-ink uppercase tracking-wider mt-3 mb-1">
          {trimmed.replace('#### ', '')}
        </h5>
      )
    } else if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <h4 key={index} className="text-sm font-bold text-ink mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          {trimmed.replace('### ', '')}
        </h4>
      )
    } else if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <h3 key={index} className="text-base font-bold text-ink mt-4 mb-2">
          {trimmed.replace('## ', '')}
        </h3>
      )
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      inList = true
      listItems.push(trimmed.slice(2))
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList()
      elements.push(
        <div key={index} className="text-sm text-ink leading-relaxed my-1 pl-2 border-l-2 border-border-hairline">
          {renderInline(trimmed)}
        </div>
      )
    } else {
      flushList()
      elements.push(
        <p key={index} className="text-sm text-ink leading-relaxed my-1.5">
          {renderInline(trimmed)}
        </p>
      )
    }
  })

  flushList()

  return <div className="space-y-1">{elements}</div>
}

function EvidenceBlock({ evidence }) {
  const [open, setOpen] = useState(false)
  if (!evidence) return null

  return (
    <div className="mt-3 border border-border-hairline rounded bg-sunken">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-ink-secondary hover:text-ink transition-colors"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          Data Grounding & Evidence Trace
        </span>
        <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border-hairline">
          {evidence.ai_engine || 'Grounded Facts'}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-border-hairline pt-2 text-xs">
          {evidence.tools_called?.length > 0 && (
            <div>
              <span className="field-label">Verified Tools Invoked</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {evidence.tools_called.map((t, i) => (
                  <span
                    key={i}
                    className="bg-surface border border-border-hairline px-1.5 py-0.5 rounded font-mono text-[10px] text-ink"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {evidence.data_sources?.length > 0 && (
            <div>
              <span className="field-label">Authoritative Data Sources</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {evidence.data_sources.map((s, i) => (
                  <span key={i} className="text-[11px] text-ink-secondary bg-surface px-1.5 py-0.5 rounded border border-border-hairline">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {evidence.provenance_tags?.length > 0 && (
            <div>
              <span className="field-label">Provenance Level</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {evidence.provenance_tags.map((t, i) => (
                  <ProvenanceChip key={i} tag={t} />
                ))}
              </div>
            </div>
          )}

          {evidence.timestamps && Object.keys(evidence.timestamps).length > 0 && (
            <div>
              <span className="field-label">Telemetry As Of</span>
              <div className="text-[10px] font-mono text-ink-secondary mt-1 bg-surface p-1.5 rounded border border-border-hairline">
                {Object.entries(evidence.timestamps).map(([k, v]) => (
                  <div key={k}>{k}: {v}</div>
                ))}
              </div>
            </div>
          )}

          {evidence.model_versions?.length > 0 && (
            <div>
              <span className="field-label">Inference Model & Calibrations</span>
              <div className="text-[10px] text-ink-secondary mt-1 font-mono">
                {evidence.model_versions.join(' · ')}
              </div>
            </div>
          )}

          {evidence.limitations && (
            <div>
              <span className="field-label">Declared Operational Limitations</span>
              <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed bg-surface p-1.5 rounded border border-border-hairline">
                {evidence.limitations}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AnswerMessage({ question, answer, evidence, suggestedActions, timestamp }) {
  const navigate = useNavigate()

  return (
    <div className="border border-border-hairline rounded bg-surface p-4 space-y-3 shadow-xs">
      {/* Question */}
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded bg-sunken text-ink-secondary flex items-center justify-center text-xs shrink-0 mt-0.5">
          <UserIcon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink leading-relaxed">{question}</p>
        </div>
      </div>

      {/* Answer */}
      <div className="flex items-start gap-2.5 pt-1">
        <div className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <FormattedAnswer text={answer} />
        </div>
      </div>

      {/* Evidence */}
      <EvidenceBlock evidence={evidence} />

      {/* Suggested actions */}
      {suggestedActions?.length > 0 && (
        <div className="pt-2 border-t border-border-hairline">
          <p className="field-label mb-1.5">Actionable Recommendations & Quick Navigation</p>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  if (action.target) navigate(action.target)
                }}
                className="btn-ghost text-xs flex items-center gap-1.5 hover:border-primary text-primary"
              >
                <span>{action.label || action}</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-secondary mt-1.5">
            Operational recommendations are interactive proposals grounded in telemetry. Click to inspect live data in the corresponding module.
          </p>
        </div>
      )}

      <div className="text-[10px] text-ink-secondary font-mono flex items-center justify-between pt-1">
        <span>UrbanIQ Telemetry Grounded Engine</span>
        <span>{formatDateTime(timestamp)}</span>
      </div>
    </div>
  )
}

export default function AssistantPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['assistant-status'],
    queryFn: () => assistantApi.status(),
    staleTime: 60_000,
  })

  const aiStatus = statusData?.data || {}

  async function submitQuery(overrideQuestion) {
    const q = (overrideQuestion || query).trim()
    if (!q) return
    setLoading(true)
    setError('')
    try {
      const res = await assistantApi.query({ question: q })
      const result = res.data || res
      setMessages((prev) => [
        {
          question: q,
          answer: result.answer,
          evidence: result.evidence,
          suggestedActions: result.suggested_actions || [],
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ])
      if (!overrideQuestion) setQuery('')
    } catch (e) {
      setError(e.message || 'Assistant query could not be completed. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-base font-semibold text-ink flex items-center gap-2">
            Urban Planning Assistant
            <span className="text-xs font-normal text-ink-secondary bg-sunken px-2 py-0.5 rounded border border-border-hairline">
              Coimbatore CMC
            </span>
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Data-grounded queries regarding Coimbatore corridors, air quality, energy loads, and demographics. Powered by verified database telemetry.
          </p>
        </div>

        {/* AI Engine Status Badge */}
        <div className="shrink-0 flex items-center gap-2">
          {aiStatus.status === 'CONNECTED' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="font-semibold">
                {aiStatus.provider?.includes('Groq') ? 'Groq LPU Active' : 'AI Inference Active'}
              </span>
              <span className="text-[10px] text-emerald-700 font-mono bg-emerald-100/60 px-1.5 py-0.5 rounded">
                {aiStatus.model || 'qwen-27b'}
              </span>
            </div>
          ) : aiStatus.status === 'PERMISSION_DENIED' ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs"
              title={aiStatus.error_detail}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold">Local Grounded Facts</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface border border-border-hairline text-ink-secondary text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Grounded Telemetry Engine Active</span>
            </div>
          )}

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="btn-ghost text-xs p-1.5 text-ink-secondary hover:text-ink"
              title="Clear conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Query console */}
      <div className="card p-4 shrink-0 shadow-xs">
        <label className="field-label block mb-2">Municipal Query Console</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submitQuery()
            }
          }}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-border-hairline rounded bg-surface text-ink focus:outline-none focus:border-primary resize-none font-sans"
          placeholder="Ask a question about Coimbatore traffic, air quality, energy grid demand, population, or risks…"
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2.5 gap-2">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_QUERIES.slice(0, 4).map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(q)
                  submitQuery(q)
                }}
                className="text-[11px] px-2 py-1 rounded border border-border-hairline text-ink-secondary hover:text-ink hover:bg-sunken transition-colors text-left"
              >
                {q.length > 55 ? q.slice(0, 52) + '…' : q}
              </button>
            ))}
          </div>

          <button
            onClick={() => submitQuery()}
            disabled={!query.trim() || loading}
            className="btn-primary text-sm gap-1.5 ml-auto shrink-0 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Synthesizing…' : 'Ask Assistant'}
          </button>
        </div>

        {error && (
          <div className="mt-2.5 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => submitQuery()}
              className="text-xs font-semibold underline ml-2"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading && (
          <div className="card p-4 space-y-2 border border-border-hairline animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs font-semibold text-primary">Grounding telemetry and synthesizing response via Groq LPU...</span>
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-10 w-full mt-2" />
          </div>
        )}

        {messages.map((m, i) => (
          <AnswerMessage key={i} {...m} />
        ))}

        {messages.length === 0 && !loading && (
          <div className="text-center py-12 text-ink-secondary border border-dashed border-border-hairline rounded bg-surface/50">
            <Bot className="w-8 h-8 text-ink-secondary/50 mx-auto mb-2" />
            <p className="text-sm font-medium text-ink">Ready for municipal intelligence queries.</p>
            <p className="text-xs text-ink-secondary mt-1 max-w-md mx-auto">
              Click any of the suggested queries above or type your question. Responses are strictly grounded in runtime Coimbatore telemetry, sensor observations, and model forecasts.
            </p>
          </div>
        )}
      </div>

      <div className="text-[10px] text-ink-secondary shrink-0 flex items-center justify-between border-t border-border-hairline pt-2">
        <span>Engine: {aiStatus.provider || 'Grounded Facts'} · Model: {aiStatus.model || 'qwen-27b'}</span>
        <span>Coimbatore Municipal Corporation Smart Operations Digital Twin</span>
      </div>
    </div>
  )
}
