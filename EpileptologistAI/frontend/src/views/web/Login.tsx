import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Input } from '../../components/ui'
import PresentationBackdrop from '../../components/PresentationBackdrop'
import { useAuth } from '../../lib/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendNotice, setResendNotice] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const { signIn, resendSignupVerification } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResendNotice('')
    setLoading(true)

    const loginEmail = email.trim()
    const { error } = await signIn(loginEmail, password)
    setLoading(false)

    if (!error) return

    const lower = error.toLowerCase()
    const unverified = lower.includes('email not confirmed') || lower.includes('email not verified')
    if (unverified) {
      setPendingVerificationEmail(loginEmail)
      setError('Please verify your email before signing in. You can resend the verification email below.')
      return
    }

    setPendingVerificationEmail('')
    setError(error)
  }

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail || resendCooldown > 0) return
    setResendLoading(true)
    setResendNotice('')
    const { error } = await resendSignupVerification(pendingVerificationEmail)
    setResendLoading(false)
    setResendNotice(error ?? `Verification email resent to ${pendingVerificationEmail}.`)
    setResendCooldown(60)
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => window.clearInterval(id)
  }, [resendCooldown])

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center relative overflow-hidden">
      <PresentationBackdrop />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-10 text-center">
          <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Secure access
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-50 sm:text-[2rem]">
            Welcome back
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            Sign in to{' '}
            <span className="font-display font-medium text-slate-300">
              Epileptologist
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-400">
                AI
              </span>
            </span>{' '}
            - a live EEG monitoring and session intelligence.
          </p>
        </div>

        <Card
          elevated
          glow="accent"
          className="space-y-6 rounded-3xl !p-8 shadow-[0_32px_120px_-48px_rgba(0,0,0,0.75)] backdrop-blur-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-300">Password</label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            {pendingVerificationEmail && (
              <div className="space-y-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                <p className="text-xs text-amber-300">Need a new verification link?</p>
                <Button type="button" variant="outline" className="w-full" onClick={handleResendVerification} disabled={resendLoading || resendCooldown > 0}>
                  {resendLoading ? 'Resending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
                </Button>
                {resendNotice && <p className="text-xs text-slate-300">{resendNotice}</p>}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Create one
            </Link>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          For educational purposes only. Not a medical device.
        </p>
      </div>
    </div>
  )
}
