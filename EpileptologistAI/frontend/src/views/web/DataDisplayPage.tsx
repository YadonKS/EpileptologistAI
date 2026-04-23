import { useState, useMemo, useEffect } from 'react'
import { Card } from '../../components/ui'
import { Button } from '../../components/ui'
import EEGWaveform from '../../components/EEGWaveform'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { useAuth } from '../../lib/auth'
import { useMonitoring } from '../../lib/monitoring'
import { getSessionPredictions, getUserSessions, type SessionRecord } from '../../lib/sessions'

const BAND_COLORS: Record<string, string> = {
  Delta: '#8b5cf6',
  Theta: '#e879f9',
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
  const {
    lastWindowData,
    isMonitoring,
    monitoringStatus,
    livePredictions,
    liveRunStartedAtMs,
    liveSessionId,
    completion,
  } = useMonitoring()
  const [tab, setTab] = useState<'signals' | 'power' | 'history'>('signals')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [emailingReport, setEmailingReport] = useState(false)
  const [emailNotice, setEmailNotice] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [selectedWindow, setSelectedWindow] = useState<HistoryPoint | null>(null)
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null)

  const bandPowers = useMemo(generateBandPowers, [])

  const isLiveHistory =
    (monitoringStatus === 'running' || monitoringStatus === 'starting') &&
    livePredictions.length > 0 &&
    liveRunStartedAtMs != null &&
    liveSessionId != null

  const displayHistory = useMemo((): HistoryPoint[] => {
    if (!isLiveHistory || liveRunStartedAtMs == null || !liveSessionId) {
      return history
    }
    const anchor = liveRunStartedAtMs
    return livePredictions.map((p) => {
      const start = new Date(anchor + (p.window - 1) * WINDOW_DURATION_SEC * 1000)
      const end = new Date(start.getTime() + WINDOW_DURATION_SEC * 1000)
      return {
        window: p.window,
        proba: p.probability,
        prediction: p.prediction,
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        capturedAt: new Date().toISOString(),
        source: 'session' as const,
        sessionId: liveSessionId,
      }
    })
  }, [history, isLiveHistory, livePredictions, liveRunStartedAtMs, liveSessionId])

  const collectedAtLabel = useMemo(() => {
    if (!displayHistory.length) return null
    if (isLiveHistory && liveRunStartedAtMs != null) {
      return `Live · started ${formatDateTime(new Date(liveRunStartedAtMs).toISOString())}`
    }
    return formatDateTime(displayHistory[0].startedAt)
  }, [displayHistory, isLiveHistory, liveRunStartedAtMs])
  const avgProbability = useMemo(
    () => displayHistory.reduce((s, h) => s + h.proba, 0) / Math.max(displayHistory.length, 1),
    [displayHistory]
  )
  const flaggedWindows = useMemo(() => displayHistory.filter((h) => h.proba >= 0.5).length, [displayHistory])
  const finalVerdict = flaggedWindows >= 2 ? 'Seizure Pattern' : 'No Seizure'

  const sendAnalyticsEmail = async () => {
    if (!user?.email) {
      setEmailError('No recipient email found on your account.')
      return
    }
    if (!displayHistory.length) {
      setEmailError('No analytics data available to send yet.')
      return
    }

    setEmailingReport(true)
    setEmailError(null)
    setEmailNotice(null)

    try {
      const payload = {
        to_email: user.email,
        user_name: (user.user_metadata?.full_name as string | undefined) ?? user.email,
        session_id: activeSession?.id ?? displayHistory[0]?.sessionId ?? liveSessionId ?? null,
        collected_at: activeSession?.started_at ?? displayHistory[0]?.startedAt ?? null,
        summary: {
          total_windows: displayHistory.length,
          avg_probability: avgProbability,
          flagged_windows: flaggedWindows,
          final_verdict: finalVerdict,
        },
        history: displayHistory.map((h) => ({
          window: h.window,
          probability: h.proba,
          prediction: h.prediction,
          started_at: h.startedAt,
          ended_at: h.endedAt,
          captured_at: h.capturedAt,
        })),
      }

      const res = await fetch('http://127.0.0.1:8000/api/analytics/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let message = 'Could not send analytics email.'
        try {
          const data = await res.json()
          message = data?.detail ?? message
        } catch {
          const txt = await res.text()
          if (txt) message = txt
        }
        throw new Error(message)
      }

      setEmailNotice(`Analytics report emailed to ${user.email}.`)
    } catch (err: any) {
      setEmailError(err?.message ?? 'Could not send analytics email.')
    } finally {
      setEmailingReport(false)
    }
  }

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
  }, [user, completion])

  const tabs = [
    { key: 'signals' as const, label: 'EEG Signal' },
    { key: 'power' as const, label: 'Band Power' },
    { key: 'history' as const, label: 'Prediction History' },
  ]

  return (
    <div className="relative space-y-6">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-72 rounded-full bg-fuchsia-600/[0.1] blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-100 sm:text-[1.75rem]">Data Analysis</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
          EEG signal, frequency bands, and prediction history from your sessions.
        </p>
      </div>

      <div className="relative w-fit [perspective:800px]">
        <div className="flex gap-0.5 rounded-2xl border border-white/[0.08] bg-black/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_40px_-24px_rgba(0,0,0,0.6)] backdrop-blur-md">
          {tabs.map(({ key, label }) => (
            <Button
              key={key}
              variant={tab === key ? 'default' : 'ghost'}
              size="sm"
              className={
                tab === key
                  ? 'rounded-xl shadow-[0_10px_28px_-8px_rgba(124,58,246,0.45)] ring-1 ring-white/10'
                  : 'rounded-xl transition-transform duration-200 hover:bg-white/[0.04]'
              }
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {tab === 'signals' && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-gray-800/50 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-200">EEG signal</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Six-channel stream from the device (256 Hz). When monitoring is active, the canvas shows the latest
              window; otherwise it stays paused for a stable demo view.
            </p>
          </div>
          <div className="p-3">
            <EEGWaveform channels={6} height={360} speed={2} streamedWindow={lastWindowData} paused={!isMonitoring} />
          </div>
        </Card>
      )}

      {tab === 'power' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card elevated>
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
              <Card key={band.name} elevated className="flex items-center gap-4 py-4">
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
          <Card elevated>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-200">Seizure Probability per Window</h2>
                {isLiveHistory && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    Live
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(activeSession || collectedAtLabel) && (
                  <p className="text-xs text-slate-500">
                    Collected: {activeSession ? formatDateTime(activeSession.started_at) : collectedAtLabel}
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={sendAnalyticsEmail}
                  disabled={emailingReport || !displayHistory.length}
                >
                  {emailingReport ? 'Sending...' : 'Email Report'}
                </Button>
              </div>
            </div>

            {emailNotice && <p className="text-xs text-emerald-400 mb-3">{emailNotice}</p>}
            {emailError && <p className="text-xs text-amber-400 mb-3">{emailError}</p>}

            {historyLoading && (
              <p className="text-xs text-slate-500 mb-4">Loading prediction history...</p>
            )}

            {historyError && (
              <p className="text-xs text-amber-400 mb-4">{historyError}</p>
            )}

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayHistory} barSize={6}>
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
                      const item = displayHistory[index]
                      if (item) {
                        setSelectedWindow(item)
                      }
                    }}
                  >
                    {displayHistory.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.proba >= 0.5 ? '#ef4444' : '#c084fc'}
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

          <Card elevated>
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Session Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Total Windows</p>
                <p className="text-lg font-bold font-mono text-slate-200">{displayHistory.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg Probability</p>
                <p className="text-lg font-bold font-mono text-brand-400">
                  {avgProbability.toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Flagged Windows</p>
                <p className="text-lg font-bold font-mono text-red-400">
                  {flaggedWindows}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Final Verdict</p>
                <p className={`text-lg font-bold ${flaggedWindows >= 2 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {finalVerdict}
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
