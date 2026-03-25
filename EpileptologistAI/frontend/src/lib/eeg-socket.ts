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

interface UseEEGSocketReturn {
  lastPrediction: PredictionMessage | null
  completion: CompleteMessage | null
  error: string | null
  isConnected: boolean
  cancel: () => void
}

export function useEEGSocket(sessionId: string | null): UseEEGSocketReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const [lastPrediction, setLastPrediction] = useState<PredictionMessage | null>(null)
  const [completion, setCompletion] = useState<CompleteMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    setLastPrediction(null)
    setCompletion(null)
    setError(null)

    const ws = new WebSocket(`${WS_BASE}/api/ws/${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => setIsConnected(true)

    ws.onmessage = (event) => {
      const data: WSMessage = JSON.parse(event.data)
      if (data.type === 'prediction') {
        setLastPrediction(data)
      } else if (data.type === 'complete') {
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

  return { lastPrediction, completion, error, isConnected, cancel }
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
