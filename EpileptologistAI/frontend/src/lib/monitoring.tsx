import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './auth'
import { useEEGSocket, startSession, stopSession } from './eeg-socket'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'
type MonitoringStatus = 'idle' | 'starting' | 'running'
type SignalQualityState = 'unchecked' | 'checking' | 'good' | 'poor'

interface MonitoringContextValue {
  connectionStatus: ConnectionStatus
  monitoringStatus: MonitoringStatus
  signalQualityState: SignalQualityState
  signalQualityScore: number | null
  signalQualityMessage: string | null
  backendError: string | null
  lastPrediction: ReturnType<typeof useEEGSocket>['lastPrediction']
  completion: ReturnType<typeof useEEGSocket>['completion']
  isConnected: boolean
  isMonitoring: boolean
  connectDevice: () => Promise<void>
  disconnectDevice: () => Promise<void>
  startMonitoring: () => Promise<void>
  stopMonitoring: () => Promise<void>
  checkSignalQuality: () => Promise<void>
  clearBackendError: () => void
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
  const sessionIdRef = useRef<string | null>(null)

  const { lastPrediction, completion, error: wsError, isConnected: wsConnected, cancel: wsCancel } = useEEGSocket(sessionId)

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
      sessionIdRef.current = null
    }
  }, [user])

  useEffect(() => {
    if (wsConnected && monitoringStatus === 'starting') {
      setMonitoringStatus('running')
    }
  }, [wsConnected, monitoringStatus])

  useEffect(() => {
    if (completion) {
      setMonitoringStatus('idle')
      setSessionId(null)
      sessionIdRef.current = null
    }
  }, [completion])

  useEffect(() => {
    if (wsError) {
      setBackendError(wsError)
      setMonitoringStatus('idle')
      setSessionId(null)
      sessionIdRef.current = null
    }
  }, [wsError])

  const clearBackendError = useCallback(() => {
    setBackendError(null)
  }, [])

  const stopMonitoringInternal = useCallback(async () => {
    if (!sessionIdRef.current) {
      setMonitoringStatus('idle')
      return
    }

    wsCancel()
    await stopSession(sessionIdRef.current).catch(console.error)
    setMonitoringStatus('idle')
    setSessionId(null)
    sessionIdRef.current = null
  }, [wsCancel])

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
    setMonitoringStatus('starting')

    try {
      const sid = await startSession(user.id)
      sessionIdRef.current = sid
      setSessionId(sid)
    } catch {
      setBackendError('Monitoring could not start. Please try again.')
      setMonitoringStatus('idle')
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
    completion,
    isConnected,
    isMonitoring,
    connectDevice,
    disconnectDevice,
    startMonitoring: startMonitoringFlow,
    stopMonitoring: stopMonitoringInternal,
    checkSignalQuality,
    clearBackendError,
  }), [
    backendError,
    checkSignalQuality,
    clearBackendError,
    completion,
    connectDevice,
    connectionStatus,
    disconnectDevice,
    isConnected,
    isMonitoring,
    lastPrediction,
    monitoringStatus,
    signalQualityMessage,
    signalQualityScore,
    signalQualityState,
    startMonitoringFlow,
    stopMonitoringInternal,
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
