import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/auth'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/data', label: 'Data Analysis' },
  { to: '/about', label: 'About' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <LayoutHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </main>
      <footer className="border-t border-gray-800/50 bg-surface/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            &copy; 2025 EpileptologistAI &mdash; For educational purposes only. Not a medical device.
          </p>
          <p className="text-xs text-slate-600">Capstone Project</p>
        </div>
      </footer>
    </div>
  )
}

function LayoutHeader() {
  const location = useLocation()
  const { user, signOut } = useAuth()

  return (
    <header className="border-b border-gray-800/50 bg-surface/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-100 tracking-tight">
            Epileptologist<span className="text-brand-400">AI</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                location.pathname === to
                  ? 'text-brand-400 bg-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              {label}
            </Link>
          ))}

          {user && (
            <>
              <div className="ml-3 h-6 w-px bg-gray-800" />
              <span className="ml-3 text-xs text-slate-500 hidden md:inline">
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="ml-3 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              >
                Sign Out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
