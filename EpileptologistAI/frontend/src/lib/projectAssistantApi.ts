const SYSTEM_PROMPT = `You are a concise technical assistant for the EpileptologistAI university capstone project.
Scope: real-time EEG from a 6-channel Arduino setup at 256 Hz, 6-second windows, XGBoost seizure detection, epilepsy risk heuristic (2+ seizure-like windows in a session), React dashboard, Supabase backend.
Rules: Answer only about this project, stack, and demo behavior. If asked for medical advice, say you cannot give medical advice and the app is not a medical device. Keep answers short unless the user asks for detail.`

export type AssistantMessage = { role: 'user' | 'assistant'; content: string }

function resolveAssistantUrl(): string {
  const configuredUrl = import.meta.env.VITE_PROJECT_ASSISTANT_URL?.trim()
  if (configuredUrl) return configuredUrl

  // Default to the local FastAPI route, which is already proxied in Vite dev.
  return '/api/project-assistant'
}

function extractReplyText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>

  if (typeof d.reply === 'string') return d.reply
  if (typeof d.answer === 'string') return d.answer
  if (typeof d.response === 'string') return d.response
  if (typeof d.text === 'string') return d.text
  if (typeof d.content === 'string') return d.content

  const choices = d.choices
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const c0 = choices[0] as Record<string, unknown>
    const msg = c0.message
    if (msg && typeof msg === 'object') {
      const content = (msg as Record<string, unknown>).content
      if (typeof content === 'string') return content
    }
    const text = c0.text
    if (typeof text === 'string') return text
  }

  const message = d.message
  if (typeof message === 'string') return message
  if (message && typeof message === 'object') {
    const content = (message as Record<string, unknown>).content
    if (typeof content === 'string') return content
  }

  return null
}

export async function askProjectAssistant(
  history: AssistantMessage[],
  userQuestion: string
): Promise<string> {
  const url = resolveAssistantUrl()
  const apiKey = import.meta.env.VITE_PROJECT_ASSISTANT_API_KEY?.trim()

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userQuestion },
  ]

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ messages }),
  })

  const rawText = await res.text()
  let parsed: unknown
  try {
    parsed = rawText ? JSON.parse(rawText) : {}
  } catch {
    parsed = { raw: rawText }
  }

  if (!res.ok) {
    const errObj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    const detail =
      (typeof errObj.detail === 'string' && errObj.detail) ||
      (typeof errObj.error === 'string' && errObj.error) ||
      (typeof errObj.message === 'string' && errObj.message) ||
      rawText ||
      res.statusText
    throw new Error(detail || `Request failed (${res.status})`)
  }

  const reply = extractReplyText(parsed)
  if (reply) return reply.trim()

  if (typeof rawText === 'string' && rawText.length > 0 && rawText.length < 4000) {
    return rawText.trim()
  }

  throw new Error('Assistant returned an empty or unrecognized response shape.')
}
