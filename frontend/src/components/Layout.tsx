import React from 'react'
import { Link } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }){
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-sky-600">EpileptologistAI</Link>
          <nav className="space-x-3">
            <Link to="/examples" className="text-slate-600 hover:text-slate-900">Examples</Link>
            <Link to="/mobile" className="text-slate-600 hover:text-slate-900">Mobile</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">{children}</main>
    </div>
  )
}
