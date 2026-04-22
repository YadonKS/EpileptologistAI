import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { Input } from '../../components/ui'
import { useAuth } from '../../lib/auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  }
}

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [requiresVerification, setRequiresVerification] = useState(true)
  const [emailLikelySent, setEmailLikelySent] = useState(true)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendNotice, setResendNotice] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const { signUp, resendSignupVerification } = useAuth()
  const emailTrimmed = email.trim()
  const emailLooksValid = EMAIL_REGEX.test(emailTrimmed)
  const pwd = getPasswordChecks(password)
  const strengthScore = [pwd.hasUpper, pwd.hasLower, pwd.hasNumber, pwd.hasSymbol].filter(Boolean).length
  const isStrongPassword = pwd.minLength && strengthScore >= 3

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!EMAIL_REGEX.test(emailTrimmed)) {
      setError('Please enter a valid email address')
      return
    }

    if (!isStrongPassword) {
      setError('Password must be 8+ chars and include at least 3 of: uppercase, lowercase, number, symbol')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error, requiresEmailVerification, emailLikelySent } = await signUp(emailTrimmed, password, name.trim())
    setLoading(false)

    if (error) {
      setError(error)
    } else {
      setRequiresVerification(requiresEmailVerification)
      setEmailLikelySent(emailLikelySent)
      setSuccess(true)
    }
  }

  const handleResendVerification = async () => {
    const targetEmail = emailTrimmed
    if (!targetEmail || resendCooldown > 0) return
    setResendLoading(true)
    setResendNotice('')
    const { error } = await resendSignupVerification(targetEmail)
    setResendLoading(false)
    setResendNotice(error ?? `Verification email resent to ${targetEmail}.`)
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
    <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 items-center justify-center mb-4 shadow-lg shadow-brand-500/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">Get started with EpileptologistAI</p>
        </div>

        <div className="bg-surface border border-gray-800/50 rounded-2xl p-8 space-y-6 glow-cyan">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex h-14 w-14 rounded-full bg-emerald-500/10 items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-200">Check your email</h2>
              {requiresVerification ? (
                <>
                  {emailLikelySent ? (
                    <p className="text-sm text-slate-400">
                      We sent a confirmation link to <span className="text-slate-200">{email}</span>.
                      Click it to activate your account.
                    </p>
                  ) : (
                    <p className="text-sm text-amber-300">
                      If this email already has an account, Supabase may not send another signup confirmation email.
                      Try signing in and use "Resend verification email" from the login screen.
                    </p>
                  )}
                  <Button type="button" variant="outline" onClick={handleResendVerification} disabled={resendLoading || resendCooldown > 0}>
                    {resendLoading ? 'Resending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-amber-300">
                  Your project currently signs users up as already verified. If you want a verification prompt every time,
                  enable "Confirm email" in Supabase Auth settings.
                </p>
              )}
              {resendNotice && (
                <p className="text-xs text-slate-400">{resendNotice}</p>
              )}
              <Link to="/login" className="inline-block text-sm text-brand-400 hover:text-brand-300 font-medium">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-medium text-slate-300">Full Name</label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                  {email.length > 0 && !emailLooksValid && (
                    <p className="text-xs text-amber-400">Enter a valid email like name@example.com</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-slate-300">Password</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <div className="grid grid-cols-1 gap-1 text-xs text-slate-500">
                    <p className={pwd.minLength ? 'text-emerald-400' : 'text-slate-500'}>8+ characters</p>
                    <p className={pwd.hasUpper ? 'text-emerald-400' : 'text-slate-500'}>At least one uppercase letter</p>
                    <p className={pwd.hasLower ? 'text-emerald-400' : 'text-slate-500'}>At least one lowercase letter</p>
                    <p className={pwd.hasNumber ? 'text-emerald-400' : 'text-slate-500'}>At least one number</p>
                    <p className={pwd.hasSymbol ? 'text-emerald-400' : 'text-slate-500'}>At least one symbol</p>
                    <p className={isStrongPassword ? 'text-emerald-400' : 'text-amber-400'}>
                      Strength: {isStrongPassword ? 'Good' : 'Needs improvement'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm" className="text-sm font-medium text-slate-300">Confirm Password</label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              <div className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
