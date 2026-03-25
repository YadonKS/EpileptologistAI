import { supabase } from './supabase'

export interface SessionRecord {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  total_windows: number
  avg_probability: number | null
  final_prediction: number | null
  status: 'recording' | 'completed' | 'cancelled'
  created_at: string
}

export interface PredictionRecord {
  id: string
  session_id: string
  window_number: number
  prediction: number
  probability: number
  created_at: string
}

// ── Sessions ──

export async function createSession(userId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as SessionRecord
}

export async function completeSession(
  sessionId: string,
  totalWindows: number,
  avgProbability: number,
  finalPrediction: number
) {
  const { error } = await supabase
    .from('sessions')
    .update({
      ended_at: new Date().toISOString(),
      total_windows: totalWindows,
      avg_probability: avgProbability,
      final_prediction: finalPrediction,
      status: 'completed',
    })
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}

export async function cancelSession(sessionId: string) {
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'cancelled', ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}

export async function getUserSessions(userId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []) as SessionRecord[]
}

// ── Predictions ──

export async function insertPrediction(
  sessionId: string,
  windowNumber: number,
  prediction: number,
  probability: number
) {
  const { error } = await supabase
    .from('predictions')
    .insert({
      session_id: sessionId,
      window_number: windowNumber,
      prediction,
      probability,
    })
  if (error) throw new Error(error.message)
}

export async function getSessionPredictions(sessionId: string) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('session_id', sessionId)
    .order('window_number', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as PredictionRecord[]
}
