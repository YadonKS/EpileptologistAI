import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { Input } from '../../components/ui'
import BrandLogo from '../../components/BrandLogo'
import { useAuth } from '../../lib/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)
    if (error) {
      setError(error)
      setLoading(false)
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
          <div className="inline-flex h-14 w-14 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-brand-500/20 overflow-hidden bg-slate-900/60">
            <BrandLogo className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            Epileptologist<span className="text-brand-400">AI</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your monitoring dashboard</p>
        </div>

        <div className="bg-surface border border-gray-800/50 rounded-2xl p-8 space-y-6 glow-cyan">
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
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          For educational purposes only. Not a medical device.
        </p>
      </div>
    </div>
  )
}
