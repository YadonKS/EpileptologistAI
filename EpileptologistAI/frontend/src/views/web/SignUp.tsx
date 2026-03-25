import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { Input } from '../../components/ui'
import { useAuth } from '../../lib/auth'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { error } = await signUp(email, password, name)
    setLoading(false)

    if (error) {
      setError(error)
    } else {
      setSuccess(true)
    }
  }

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
              <p className="text-sm text-slate-400">
                We sent a confirmation link to <span className="text-slate-200">{email}</span>.
                Click it to activate your account.
              </p>
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
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-slate-300">Password</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm" className="text-sm font-medium text-slate-300">Confirm Password</label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
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
