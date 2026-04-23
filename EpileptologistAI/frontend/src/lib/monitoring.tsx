import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './auth'
import { useEEGSocket, startSession, stopSession, type LivePredictionPoint } from './eeg-socket'
import { defaultAccountSettings, getAccountSettings } from './accountSettings'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
type MonitoringStatus = 'idle' | 'starting' | 'running'
type SignalQualityState = 'unchecked' | 'checking' | 'good' | 'poor'

export interface MonitoringAlert {
  id: string
  window: number
  probability: number
}

interface MonitoringContextValue {
  connectionStatus: ConnectionStatus
  monitoringStatus: MonitoringStatus
  signalQualityState: SignalQualityState
  signalQualityScore: number | null
  signalQualityMessage: string | null
  backendError: string | null
  lastPrediction: ReturnType<typeof useEEGSocket>['lastPrediction']
  lastWindowData: ReturnType<typeof useEEGSocket>['lastWindowData']
  livePredictions: LivePredictionPoint[]
  liveRunStartedAtMs: number | null
  liveSessionId: string | null
  completion: ReturnType<typeof useEEGSocket>['completion']
  elapsedSeconds: number
  emailAlertsEnabled: boolean
  inAppAlertsEnabled: boolean
  alerts: MonitoringAlert[]
  isConnected: boolean
  isMonitoring: boolean
  connectDevice: () => Promise<void>
  disconnectDevice: () => Promise<void>
  startMonitoring: () => Promise<void>
  stopMonitoring: () => Promise<void>
  checkSignalQuality: () => Promise<void>
  clearBackendError: () => void
  setEmailAlertsEnabled: (enabled: boolean) => void
  setInAppAlertsEnabled: (enabled: boolean) => void
  dismissAlert: (id: string) => void
}

const MonitoringContext = createContext<MonitoringContextValue | undefined>(undefined)

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>('idle')
  const [signalQualityState, setSignalQualityState] = useState<SignalQualityState>('unchecked')
  const [signalQualityScore, setSignalQualityScore] = useState<number | null>(null)
  const [signalQualityMessage, setSignalQualityMessage] = useState<string | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(defaultAccountSettings.emailAlerts)
  const [inAppAlertsEnabled, setInAppAlertsEnabled] = useState(defaultAccountSettings.inAppAlerts)
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([])
  const [liveRunStartedAtMs, setLiveRunStartedAtMs] = useState<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const monitoringStartedAtMsRef = useRef<number | null>(null)
  const alertedWindowsRef = useRef<Set<number>>(new Set())
  const alertTimeoutsRef = useRef<Map<string, number>>(new Map())
  const emailedCompletionRef = useRef<string | null>(null)

  const {
    lastPrediction,
    lastWindowData,
    completion,
    error: wsError,
    isConnected: wsConnected,
    livePredictions,
    cancel: wsCancel,
  } = useEEGSocket(sessionId)

  const isConnected = connectionStatus === 'connected'
  const isMonitoring = monitoringStatus === 'running'

  useEffect(() => {
    if (!user) {
      setConnectionStatus('disconnected')
      setMonitoringStatus('idle')
      setSignalQualityState('unchecked')
      setSignalQualityScore(null)
      setSignalQualityMessage(null)
      setBackendError(null)
      setSessionId(null)
      setElapsedSeconds(0)
      setAlerts([])
      setLiveRunStartedAtMs(null)
      setEmailAlertsEnabled(defaultAccountSettings.emailAlerts)
      setInAppAlertsEnabled(defaultAccountSettings.inAppAlerts)
      sessionIdRef.current = null
      monitoringStartedAtMsRef.current = null
      alertedWindowsRef.current.clear()
      alertTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      alertTimeoutsRef.current.clear()
      return
    }

    getAccountSettings(user.id, user.email)
      .then((settings) => {
        setEmailAlertsEnabled(settings.emailAlerts)
        setInAppAlertsEnabled(settings.inAppAlerts)
      })
      .catch(() => {
        setEmailAlertsEnabled(defaultAccountSettings.emailAlerts)
        setInAppAlertsEnabled(defaultAccountSettings.inAppAlerts)
      })
  }, [user])

  const dismissAlert = useCallback((id: string) => {
    const timeoutId = alertTimeoutsRef.current.get(id)
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      alertTimeoutsRef.current.delete(id)
    }
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }, [])

  useEffect(() => {
    if ((monitoringStatus !== 'starting' && monitoringStatus !== 'running') || monitoringStartedAtMsRef.current === null) {
      return
    }

    const tick = () => {
      if (monitoringStartedAtMsRef.current === null) return
      setElapsedSeconds(Math.floor((Date.now() - monitoringStartedAtMsRef.current) / 1000))
    }

    tick()
    const timerId = window.setInterval(tick, 1000)
    return () => window.clearInterval(timerId)
  }, [monitoringStatus])

  useEffect(() => {
    if (lastPrediction && (monitoringStatus === 'starting' || monitoringStatus === 'running')) {
      setElapsedSeconds((prev) => Math.max(prev, lastPrediction.elapsed_seconds))
    }
  }, [lastPrediction, monitoringStatus])

  useEffect(() => {
    if (wsConnected && monitoringStatus === 'starting') {
      setMonitoringStatus('running')
    }
  }, [wsConnected, monitoringStatus])

  useEffect(() => {
    if (completion) {
      setElapsedSeconds(completion.total_windows * 6)
      monitoringStartedAtMsRef.current = null
      setLiveRunStartedAtMs(null)
      setMonitoringStatus('idle')
      setSessionId(null)
      sessionIdRef.current = null
      alertedWindowsRef.current.clear()
      emailedCompletionRef.current = null
    }
  }, [completion])

  useEffect(() => {
    if (wsError) {
      setBackendError(wsError)
      monitoringStartedAtMsRef.current = null
      setLiveRunStartedAtMs(null)
      setMonitoringStatus('idle')
      setSessionId(null)
      sessionIdRef.current = null
      alertedWindowsRef.current.clear()
      emailedCompletionRef.current = null
    }
  }, [wsError])

  useEffect(() => {
    if (!completion || !user?.email || !emailAlertsEnabled) return
    if (completion.final_prediction !== 1) return

    const completionKey = `${completion.total_windows}:${completion.seizure_count}:${completion.avg_probability.toFixed(4)}`
    if (emailedCompletionRef.current === completionKey) return
    emailedCompletionRef.current = completionKey

    const endedAt = new Date().toISOString()
    const payload = {
      to_email: user.email,
      user_name: (user.user_metadata?.full_name as string | undefined) ?? user.email,
      monitoring_ended_at: endedAt,
      avg_probability: completion.avg_probability,
      seizure_count: completion.seizure_count,
      total_windows: completion.total_windows,
    }

    fetch('http://127.0.0.1:8000/api/alerts/high-risk-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error('High-risk alert email failed', err)
    })
  }, [completion, emailAlertsEnabled, user])

  useEffect(() => {
    if (!isMonitoring || !inAppAlertsEnabled || !lastPrediction) return
    if (lastPrediction.prediction !== 1) return
    if (alertedWindowsRef.current.has(lastPrediction.window)) return

    alertedWindowsRef.current.add(lastPrediction.window)

    const id = `${lastPrediction.window}-${Date.now()}`
    const nextAlert: MonitoringAlert = {
      id,
      window: lastPrediction.window,
      probability: lastPrediction.probability,
    }
    setAlerts((prev) => [...prev.slice(-2), nextAlert])

    const timeoutId = window.setTimeout(() => {
      dismissAlert(id)
    }, 8000)
    alertTimeoutsRef.current.set(id, timeoutId)
  }, [dismissAlert, inAppAlertsEnabled, isMonitoring, lastPrediction])

  const clearBackendError = useCallback(() => {
    setBackendError(null)
  }, [])

  const stopMonitoringInternal = useCallback(async () => {
    if (!sessionIdRef.current) {
      monitoringStartedAtMsRef.current = null
      setLiveRunStartedAtMs(null)
      setMonitoringStatus('idle')
      setAlerts([])
      alertedWindowsRef.current.clear()
      emailedCompletionRef.current = null
      return
    }

    wsCancel()
    await stopSession(sessionIdRef.current).catch(console.error)
    if (lastPrediction) {
      setElapsedSeconds(lastPrediction.elapsed_seconds)
    }
    monitoringStartedAtMsRef.current = null
    setLiveRunStartedAtMs(null)
    setMonitoringStatus('idle')
    setSessionId(null)
    setAlerts([])
    alertedWindowsRef.current.clear()
    emailedCompletionRef.current = null
    sessionIdRef.current = null
  }, [lastPrediction, wsCancel])

  const connectDevice = useCallback(async () => {
    if (!user) return

    if (connectionStatus === 'connected') {
      await stopMonitoringInternal()
      setConnectionStatus('disconnected')
      setSignalQualityState('unchecked')
      setSignalQualityScore(null)
      setSignalQualityMessage(null)
      return
    }

    setBackendError(null)
    setConnectionStatus('connecting')

    try {
      const res = await fetch('http://localhost:8000/api/health')
      if (!res.ok) {
        throw new Error('Backend not available')
      }

      await fetch('http://localhost:8000/api/device/signal-quality/reset', {
        method: 'POST',
      }).catch(() => undefined)

      setConnectionStatus('connected')
      setSignalQualityState('unchecked')
      setSignalQualityScore(null)
      setSignalQualityMessage('Run signal quality check before starting monitoring.')
    } catch {
      setBackendError('Could not connect to the EEG service. Make sure the Python server is running.')
      setConnectionStatus('disconnected')
    }
  }, [connectionStatus, stopMonitoringInternal, user])

  const disconnectDevice = useCallback(async () => {
    await stopMonitoringInternal()
    setConnectionStatus('disconnected')
    setSignalQualityState('unchecked')
    setSignalQualityScore(null)
    setSignalQualityMessage(null)
    setElapsedSeconds(0)
  }, [stopMonitoringInternal])

  const checkSignalQuality = useCallback(async () => {
    if (!isConnected || isMonitoring || monitoringStatus === 'starting') return

    setSignalQualityState('checking')
    setSignalQualityMessage('Checking signal quality...')

    try {
      const res = await fetch('http://localhost:8000/api/device/signal-quality')
      if (!res.ok) {
        throw new Error('Signal quality check failed')
      }
      const data = await res.json()
      const score = typeof data?.score === 'number' ? data.score : null
      const status = data?.status === 'good' ? 'good' : 'poor'

      setSignalQualityScore(score)
      setSignalQualityState(status)
      setSignalQualityMessage(
        status === 'good'
          ? 'Signal quality is good. You can start monitoring.'
          : 'Signal quality is poor. Re-seat the cap and check electrodes, then retry.'
      )
    } catch {
      setSignalQualityState('poor')
      setSignalQualityScore(null)
      setSignalQualityMessage('Could not evaluate signal quality. Please try again.')
    }
  }, [isConnected, isMonitoring, monitoringStatus])

  const startMonitoringFlow = useCallback(async () => {
    if (!user || !isConnected || monitoringStatus !== 'idle' || signalQualityState !== 'good') return

    setBackendError(null)
    const runStart = Date.now()
    monitoringStartedAtMsRef.current = runStart
    setLiveRunStartedAtMs(runStart)
    setElapsedSeconds(0)
    setAlerts([])
    alertedWindowsRef.current.clear()
    emailedCompletionRef.current = null
    setMonitoringStatus('starting')

    try {
      const sid = await startSession(user.id)
      sessionIdRef.current = sid
      setSessionId(sid)
    } catch {
      setBackendError('Monitoring could not start. Please try again.')
      setMonitoringStatus('idle')
      setLiveRunStartedAtMs(null)
    }
  }, [isConnected, monitoringStatus, signalQualityState, user])

  const value = useMemo<MonitoringContextValue>(() => ({
    connectionStatus,
    monitoringStatus,
    signalQualityState,
    signalQualityScore,
    signalQualityMessage,
    backendError,
    lastPrediction,
    lastWindowData,
    livePredictions,
    liveRunStartedAtMs,
    liveSessionId: sessionId,
    completion,
    elapsedSeconds,
    emailAlertsEnabled,
    inAppAlertsEnabled,
    alerts,
    isConnected,
    isMonitoring,
    connectDevice,
    disconnectDevice,
    startMonitoring: startMonitoringFlow,
    stopMonitoring: stopMonitoringInternal,
    checkSignalQuality,
    clearBackendError,
    setEmailAlertsEnabled,
    setInAppAlertsEnabled,
    dismissAlert,
  }), [
    alerts,
    backendError,
    checkSignalQuality,
    clearBackendError,
    completion,
    connectDevice,
    connectionStatus,
    disconnectDevice,
    elapsedSeconds,
    emailAlertsEnabled,
    inAppAlertsEnabled,
    isConnected,
    isMonitoring,
    lastPrediction,
    lastWindowData,
    livePredictions,
    liveRunStartedAtMs,
    sessionId,
    monitoringStatus,
    signalQualityMessage,
    signalQualityScore,
    signalQualityState,
    startMonitoringFlow,
    stopMonitoringInternal,
    dismissAlert,
  ])

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>
}

export function useMonitoring() {
  const ctx = useContext(MonitoringContext)
  if (!ctx) {
    throw new Error('useMonitoring must be used within MonitoringProvider')
  }
  return ctx
}
