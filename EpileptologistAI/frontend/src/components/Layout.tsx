import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/cn'
import { useAuth } from '../lib/auth'
import InAppAlerts from './InAppAlerts'
import PresentationBackdrop from './PresentationBackdrop'
import ProjectAssistant from './ProjectAssistant'

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
    <div className="min-h-screen bg-transparent flex flex-col relative">
      <PresentationBackdrop />
      <LayoutHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 relative z-10">
        {children}
      </main>
      <InAppAlerts />
      <ProjectAssistant />
      <footer className="relative z-10 border-t border-white/[0.07] bg-surface/45 shadow-[0_-20px_40px_-28px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            &copy; 2026 EpileptologistAI &mdash; For educational purposes only. Not a medical device.
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
    <header className="relative sticky top-0 z-50 border-b border-white/[0.07] bg-surface/70 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.65)] backdrop-blur-2xl supports-[backdrop-filter]:bg-surface/55">
      <div className="max-w-7xl mx-auto px-6 h-[4.25rem] flex items-center justify-between">
        <Link
          to="/"
          className="group flex flex-col gap-0.5 rounded-lg outline-none ring-offset-2 ring-offset-bg transition-transform duration-300 [transform-style:preserve-3d] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <span className="font-display text-[1.05rem] font-semibold leading-none tracking-tight text-slate-100 transition-colors group-hover:text-white sm:text-lg">
            Epileptologist
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-200 via-fuchsia-300 to-violet-400">
              AI
            </span>
          </span>
          <span className="text-[0.625rem] font-medium uppercase tracking-[0.22em] text-slate-600">
            EEG intelligence
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-black/25 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
          {navItems.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 [transform-style:preserve-3d]',
                location.pathname === to
                  ? 'bg-gradient-to-b from-white/[0.12] to-white/[0.04] text-slate-100 shadow-[0_8px_24px_-8px_rgba(124,58,246,0.35)] ring-1 ring-white/15'
                  : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-200 hover:shadow-[0_6px_20px_-10px_rgba(0,0,0,0.5)]'
              )}
            >
              {label}
            </Link>
          ))}

          {user && (
            <>
              <div className="ml-2 h-6 w-px bg-white/[0.06]" />
              <span className="ml-3 max-w-[200px] truncate text-xs text-slate-500 hidden md:inline">
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="ml-2 rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-200"
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
