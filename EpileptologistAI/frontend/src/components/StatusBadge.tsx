import React from 'react'
import { cn } from '../lib/cn'

interface Props {
  status: 'connected' | 'connecting' | 'disconnected'
}

export default function StatusBadge({ status }: Props) {
  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border',
      status === 'connected' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      status === 'connecting' && 'bg-brand-500/10 text-brand-400 border-brand-500/20',
      status === 'disconnected' && 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    )}>
      <span className={cn(
        'h-2 w-2 rounded-full',
        status === 'connected' && 'bg-emerald-400 animate-pulse-slow',
        status === 'connecting' && 'bg-brand-400 animate-pulse',
        status === 'disconnected' && 'bg-slate-500',
      )} />
      {status === 'connected' && 'Device Connected'}
      {status === 'connecting' && 'Connecting...'}
      {status === 'disconnected' && 'Not Connected'}
    </div>
  )
}
