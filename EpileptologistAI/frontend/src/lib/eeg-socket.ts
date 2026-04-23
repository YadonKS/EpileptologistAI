import { useEffect, useRef, useState, useCallback } from 'react'

const API_BASE = 'http://localhost:8000'
const WS_BASE = 'ws://localhost:8000'

export interface PredictionMessage {
  type: 'prediction'
  window: number
  total: number
  prediction: number
  probability: number
  elapsed_seconds: number
  raw_window?: number[][]
}

export interface CompleteMessage {
  type: 'complete'
  total_windows: number
  seizure_count: number
  avg_probability: number
  final_prediction: number  // 0 = no epilepsy, 1 = epilepsy
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export type WSMessage = PredictionMessage | CompleteMessage | ErrorMessage

const LAST_RUN_STORAGE_KEY = 'eeg:lastRun'

interface CachedPredictionPoint {
  type: 'prediction'
  window: number
  total: number
  prediction: number
  probability: number
  elapsed_seconds: number
}

/** One window of predictions for live charts (upserted by `window`). */
export interface LivePredictionPoint {
  window: number
  prediction: number
  probability: number
  elapsed_seconds: number
}

interface UseEEGSocketReturn {
  lastPrediction: PredictionMessage | null
  lastWindowData: number[][] | null
  completion: CompleteMessage | null
  error: string | null
  isConnected: boolean
  livePredictions: LivePredictionPoint[]
  cancel: () => void
}

export function useEEGSocket(sessionId: string | null): UseEEGSocketReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const runStartedAtRef = useRef<string | null>(null)
  const predictionHistoryRef = useRef<CachedPredictionPoint[]>([])
  const [lastPrediction, setLastPrediction] = useState<PredictionMessage | null>(null)
  const [lastWindowData, setLastWindowData] = useState<number[][] | null>(null)
  const [completion, setCompletion] = useState<CompleteMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [livePredictions, setLivePredictions] = useState<LivePredictionPoint[]>([])

  useEffect(() => {
    if (!sessionId) {
      setLivePredictions([])
      setLastPrediction(null)
      setLastWindowData(null)
      setCompletion(null)
      setError(null)
      setIsConnected(false)
      return
    }

    const persistCache = (completedAt: string | null) => {
      try {
        localStorage.setItem(
          LAST_RUN_STORAGE_KEY,
          JSON.stringify({
            sessionId,
            runStartedAt: runStartedAtRef.current,
            completedAt,
            windows: predictionHistoryRef.current,
          })
        )
      } catch {
        // ignore storage failures (private mode/quota)
      }
    }

    setLastPrediction(null)
    setLastWindowData(null)
    setCompletion(null)
    setError(null)
    setLivePredictions([])
    runStartedAtRef.current = new Date().toISOString()
    predictionHistoryRef.current = []
    persistCache(null)

    const ws = new WebSocket(`${WS_BASE}/api/ws/${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => setIsConnected(true)

    ws.onmessage = (event) => {
      const data: WSMessage = JSON.parse(event.data)
      if (data.type === 'prediction') {
        predictionHistoryRef.current.push({
          type: 'prediction',
          window: data.window,
          total: data.total,
          prediction: data.prediction,
          probability: data.probability,
          elapsed_seconds: data.elapsed_seconds,
        })
        persistCache(null)
        setLivePredictions((prev) => {
          const rest = prev.filter((p) => p.window !== data.window)
          rest.push({
            window: data.window,
            prediction: data.prediction,
            probability: data.probability,
            elapsed_seconds: data.elapsed_seconds,
          })
          rest.sort((a, b) => a.window - b.window)
          return rest
        })
        setLastPrediction(data)
        setLastWindowData(Array.isArray(data.raw_window) ? data.raw_window : null)
      } else if (data.type === 'complete') {
        persistCache(new Date().toISOString())
        setCompletion(data)
      } else if (data.type === 'error') {
        setError(data.message)
      }
    }

    ws.onclose = () => setIsConnected(false)

    ws.onerror = () => {
      setError('WebSocket connection failed')
      setIsConnected(false)
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [sessionId])

  const cancel = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel' }))
    }
  }, [])

  return { lastPrediction, lastWindowData, completion, error, isConnected, livePredictions, cancel }
}


export async function startSession(userId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to start session: ${text}`)
  }
  const data = await res.json()
  return data.session_id
}

export async function stopSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/session/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })
}
