import { useState, useMemo, useEffect } from 'react'
import { Card } from '../../components/ui'
import { Button } from '../../components/ui'
import EEGWaveform from '../../components/EEGWaveform'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { useAuth } from '../../lib/auth'
import { getSessionPredictions, getUserSessions, type SessionRecord } from '../../lib/sessions'

const BAND_COLORS: Record<string, string> = {
  Delta: '#8b5cf6',
  Theta: '#06b6d4',
  Alpha: '#34d399',
  Beta: '#f59e0b',
  Gamma: '#ef4444',
}

const WINDOW_DURATION_SEC = 6
const HISTORY_WINDOWS = 100
const LAST_RUN_STORAGE_KEY = 'eeg:lastRun'

interface HistoryPoint {
  window: number
  proba: number
  prediction: number
  startedAt: string
  endedAt: string
  capturedAt: string
  source: 'session' | 'mock'
  sessionId?: string
}

interface CachedRunWindow {
  window: number
  prediction: number
  probability: number
}

interface CachedLastRun {
  sessionId: string
  runStartedAt?: string | null
  completedAt?: string | null
  windows: CachedRunWindow[]
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString()
}

function loadCachedLastRun(): { points: HistoryPoint[]; completedAtMs: number } | null {
  try {
    const raw = localStorage.getItem(LAST_RUN_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as CachedLastRun
    if (!parsed?.completedAt) return null
    const windows = Array.isArray(parsed?.windows) ? parsed.windows.slice(0, HISTORY_WINDOWS) : []
    if (!windows.length) return null

    const runStartedAt = parsed.runStartedAt ? new Date(parsed.runStartedAt) : new Date(Date.now() - windows.length * WINDOW_DURATION_SEC * 1000)

    const points = windows.map((p, idx) => {
      const windowNumber = typeof p.window === 'number' ? p.window : idx + 1
      const start = new Date(runStartedAt.getTime() + (windowNumber - 1) * WINDOW_DURATION_SEC * 1000)
      const end = new Date(start.getTime() + WINDOW_DURATION_SEC * 1000)
      return {
        window: windowNumber,
        proba: Number(p.probability ?? 0),
        prediction: Number(p.prediction ?? 0),
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        capturedAt: end.toISOString(),
        source: 'session' as const,
        sessionId: parsed.sessionId,
      }
    })

    const completedAtMs = parsed.completedAt ? Date.parse(parsed.completedAt) : runStartedAt.getTime()
    return { points, completedAtMs: Number.isFinite(completedAtMs) ? completedAtMs : runStartedAt.getTime() }
  } catch {
    return null
  }
}

function generateBandPowers() {
  return [
    { name: 'Delta', power: 18 + Math.random() * 12, range: '0.5-4 Hz' },
    { name: 'Theta', power: 12 + Math.random() * 8, range: '4-8 Hz' },
    { name: 'Alpha', power: 8 + Math.random() * 10, range: '8-13 Hz' },
    { name: 'Beta', power: 5 + Math.random() * 6, range: '13-30 Hz' },
    { name: 'Gamma', power: 2 + Math.random() * 4, range: '30-50 Hz' },
  ]
}

function generateHistory(n: number): HistoryPoint[] {
  const sessionStart = new Date(Date.now() - n * WINDOW_DURATION_SEC * 1000)
  return Array.from({ length: n }, (_, i) => {
    const start = new Date(sessionStart.getTime() + i * WINDOW_DURATION_SEC * 1000)
    const end = new Date(start.getTime() + WINDOW_DURATION_SEC * 1000)
    const proba = Math.max(0, Math.min(1, 0.12 + Math.random() * 0.3 + (Math.random() > 0.92 ? 0.4 : 0)))
    return {
      window: i + 1,
      proba,
      prediction: proba >= 0.5 ? 1 : 0,
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      capturedAt: end.toISOString(),
      source: 'mock',
    }
  })
}

export default function DataDisplayPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'signals' | 'power' | 'history'>('signals')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [selectedWindow, setSelectedWindow] = useState<HistoryPoint | null>(null)
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null)

  const bandPowers = useMemo(generateBandPowers, [])
  const collectedAtLabel = useMemo(() => {
    if (!history.length) return null
    return formatDateTime(history[0].startedAt)
  }, [history])

  useEffect(() => {
    let cancelled = false

    const loadHistory = async () => {
      if (!user) {
        const cached = loadCachedLastRun()
        setHistory(cached?.points ?? generateHistory(HISTORY_WINDOWS))
        setActiveSession(null)
        return
      }

      setHistoryLoading(true)
      setHistoryError(null)

      try {
        const sessions = await getUserSessions(user.id)
        const latestSession = sessions.find((s) => s.status === 'completed') ?? sessions[0]

        if (!latestSession) {
          if (!cancelled) {
            const cached = loadCachedLastRun()
            setHistory(cached?.points ?? [])
            setHistoryError(cached ? 'Showing your most recent local run.' : 'No previous run data found for this account yet.')
            setActiveSession(null)
          }
          return
        }

        const predictions = await getSessionPredictions(latestSession.id)

        if (!predictions.length) {
          if (!cancelled) {
            const cached = loadCachedLastRun()
            setHistory(cached?.points ?? [])
            setHistoryError(cached ? 'Showing your most recent local run.' : 'No prediction rows were found for your latest session.')
            setActiveSession(latestSession)
          }
          return
        }

        const sessionStart = new Date(latestSession.started_at)
        const points = predictions
          .slice()
          .sort((a, b) => a.window_number - b.window_number)
          .slice(0, HISTORY_WINDOWS)
          .map((p) => {
            const start = new Date(sessionStart.getTime() + (p.window_number - 1) * WINDOW_DURATION_SEC * 1000)
            const end = new Date(start.getTime() + WINDOW_DURATION_SEC * 1000)
            return {
              window: p.window_number,
              proba: p.probability,
              prediction: p.prediction,
              startedAt: start.toISOString(),
              endedAt: end.toISOString(),
              capturedAt: p.created_at,
              source: 'session' as const,
              sessionId: latestSession.id,
            }
          })

        const cached = loadCachedLastRun()
        const sessionFreshnessMs = Date.parse(latestSession.ended_at ?? latestSession.started_at)
        const useCached = !!cached && cached.completedAtMs > (Number.isFinite(sessionFreshnessMs) ? sessionFreshnessMs : 0)

        if (!cancelled) {
          if (useCached) {
            setHistory(cached.points)
            setActiveSession(null)
            setHistoryError('Showing your most recent local run.')
          } else {
            setHistory(points)
            setActiveSession(latestSession)
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          const cached = loadCachedLastRun()
          setHistoryError(err?.message ?? (cached ? 'Could not load cloud history. Showing your most recent local run.' : 'Failed to load session history.'))
          setHistory(cached?.points ?? [])
          setActiveSession(null)
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false)
        }
      }
    }

    loadHistory().catch(console.error)

    return () => {
      cancelled = true
    }
  }, [user])

  const tabs = [
    { key: 'signals' as const, label: 'EEG Signals' },
    { key: 'power' as const, label: 'Band Power' },
    { key: 'history' as const, label: 'Prediction History' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Data Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">Detailed view of EEG signals, frequency bands, and prediction history</p>
      </div>

      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-gray-800/50 w-fit">
        {tabs.map(({ key, label }) => (
          <Button
            key={key}
            variant={tab === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'signals' && (
        <div className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h2 className="text-sm font-semibold text-slate-200">Raw EEG Signal</h2>
              <p className="text-xs text-slate-500 mt-0.5">Unfiltered 6-channel recording from device</p>
            </div>
            <div className="p-3">
              <EEGWaveform channels={6} height={280} speed={2} />
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h2 className="text-sm font-semibold text-slate-200">Filtered Signal</h2>
              <p className="text-xs text-slate-500 mt-0.5">After bandpass (0.5-50 Hz) and notch (60 Hz) filtering</p>
            </div>
            <div className="p-3">
              <EEGWaveform channels={6} height={280} speed={2} />
            </div>
          </Card>
        </div>
      )}

      {tab === 'power' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Frequency Band Power Distribution</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bandPowers} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#374151' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#374151' }} label={{ value: 'Power (uV^2)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e2e8f0' }}
                    formatter={(value: number) => [`${value.toFixed(2)} uV^2`, 'Power']}
                  />
                  <Bar dataKey="power" radius={[6, 6, 0, 0]}>
                    {bandPowers.map((entry) => (
                      <Cell key={entry.name} fill={BAND_COLORS[entry.name]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="space-y-3">
            {bandPowers.map((band) => (
              <Card key={band.name} className="flex items-center gap-4 py-4">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${BAND_COLORS[band.name]}15` }}
                >
                  <div className="h-3 w-3 rounded-full" style={{ background: BAND_COLORS[band.name] }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">{band.name}</span>
                    <span className="text-sm font-mono" style={{ color: BAND_COLORS[band.name] }}>
                      {band.power.toFixed(2)} uV<sup>2</sup>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{band.range}</p>
                  <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(band.power / 35) * 100}%`,
                        background: BAND_COLORS[band.name],
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-slate-200">Seizure Probability per Window</h2>
              {(activeSession || collectedAtLabel) && (
                <p className="text-xs text-slate-500">
                  Collected: {activeSession ? formatDateTime(activeSession.started_at) : collectedAtLabel}
                </p>
              )}
            </div>

            {historyLoading && (
              <p className="text-xs text-slate-500 mb-4">Loading prediction history...</p>
            )}

            {historyError && (
              <p className="text-xs text-amber-400 mb-4">{historyError}</p>
            )}

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history} barSize={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="window" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#374151' }} label={{ value: 'Window #', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#374151' }} label={{ value: 'Probability', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e2e8f0' }}
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Seizure Probability']}
                  />
                  <Bar
                    dataKey="proba"
                    radius={[2, 2, 0, 0]}
                    cursor="pointer"
                    onClick={(_, index) => {
                      const item = history[index]
                      if (item) {
                        setSelectedWindow(item)
                      }
                    }}
                  >
                    {history.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.proba >= 0.5 ? '#ef4444' : '#06b6d4'}
                        fillOpacity={0.75}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-sm bg-brand-500/70" />
                  Normal (&lt; 0.5)
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-sm bg-red-500/70" />
                  Seizure detected (&ge; 0.5)
                </div>
              </div>
              <span>Click a bar for 6-second window details</span>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Session Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Total Windows</p>
                <p className="text-lg font-bold font-mono text-slate-200">{history.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg Probability</p>
                <p className="text-lg font-bold font-mono text-brand-400">
                  {(history.reduce((s, h) => s + h.proba, 0) / Math.max(history.length, 1)).toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Flagged Windows</p>
                <p className="text-lg font-bold font-mono text-red-400">
                  {history.filter((h) => h.proba >= 0.5).length}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Final Verdict</p>
                <p className={`text-lg font-bold ${history.filter((h) => h.proba >= 0.5).length >= 2 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {history.filter((h) => h.proba >= 0.5).length >= 2 ? 'Seizure Pattern' : 'No Seizure'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {selectedWindow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-500/60 p-6 shadow-2xl" style={{ backgroundColor: '#0f141f' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Window {selectedWindow.window} Details (6 seconds)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedWindow.source === 'session' ? 'Source: Recorded session data' : 'Source: Mock data'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWindow(null)}
                className="rounded-md px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-slate-400/50 bg-slate-800/90 p-3">
                <p className="text-xs text-slate-500">Window Number</p>
                <p className="text-slate-200 font-mono">{selectedWindow.window}</p>
              </div>
              <div className="rounded-lg border border-slate-400/50 bg-slate-800/90 p-3">
                <p className="text-xs text-slate-500">Seizure Probability</p>
                <p className="text-slate-200 font-mono">{(selectedWindow.proba * 100).toFixed(2)}%</p>
              </div>
              <div className="rounded-lg border border-slate-400/50 bg-slate-800/90 p-3">
                <p className="text-xs text-slate-500">Prediction Label</p>
                <p className={selectedWindow.prediction === 1 ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                  {selectedWindow.prediction === 1 ? 'Seizure Detected' : 'No Seizure'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-400/50 bg-slate-800/90 p-3">
                <p className="text-xs text-slate-500">Window Duration</p>
                <p className="text-slate-200 font-mono">{WINDOW_DURATION_SEC} seconds</p>
              </div>
              <div className="rounded-lg border border-slate-400/50 bg-slate-800/90 p-3 md:col-span-2">
                <p className="text-xs text-slate-500">Timestamp Range</p>
                <p className="text-slate-200">{formatDateTime(selectedWindow.startedAt)} to {formatDateTime(selectedWindow.endedAt)}</p>
              </div>
              <div className="rounded-lg border border-slate-400/50 bg-slate-800/90 p-3 md:col-span-2">
                <p className="text-xs text-slate-500">Captured At</p>
                <p className="text-slate-200">{formatDateTime(selectedWindow.capturedAt)}</p>
              </div>
              {selectedWindow.sessionId && (
                <div className="rounded-lg border border-slate-400/50 bg-slate-800/90 p-3 md:col-span-2">
                  <p className="text-xs text-slate-500">Session ID</p>
                  <p className="text-slate-300 font-mono text-xs break-all">{selectedWindow.sessionId}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
