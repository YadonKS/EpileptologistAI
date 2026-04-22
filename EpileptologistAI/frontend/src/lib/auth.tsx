import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  user: User | null
  session: Session | null
  isEmailVerified: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: string | null; requiresEmailVerification: boolean; emailLikelySent: boolean }>
  resendSignupVerification: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

function normalizeAuthError(message: string | null | undefined): string | null {
  if (!message) return null
  const lower = message.toLowerCase()
  if (lower.includes('email rate limit exceeded') || lower.includes('rate limit exceeded')) {
    return 'Too many verification emails were requested. Please wait a bit before trying again.'
  }
  return message
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const isEmailVerified = !!user?.email_confirmed_at

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: normalizeAuthError(error?.message) }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    const requiresEmailVerification = !data.session
    const identities = data.user?.identities
    const emailLikelySent = !error && Array.isArray(identities) ? identities.length > 0 : false
    return { error: normalizeAuthError(error?.message), requiresEmailVerification, emailLikelySent }
  }

  const resendSignupVerification = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    })
    return { error: normalizeAuthError(error?.message) }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ user, session, isEmailVerified, loading, signIn, signUp, resendSignupVerification, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
