import React from 'react'
import { Card } from './ui'
import { cn } from '../lib/cn'

interface Props {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  accent?: 'violet' | 'cyan' | 'green' | 'red' | 'yellow' | 'purple'
}

const accentColors = {
  violet: 'text-fuchsia-400',
  cyan: 'text-brand-400',
  green: 'text-emerald-400',
  red: 'text-red-400',
  yellow: 'text-yellow-400',
  purple: 'text-violet-400',
}

export default function MetricCard({ label, value, unit, accent = 'violet' }: Props) {
  return (
    <Card elevated className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={cn('text-2xl font-bold font-mono', accentColors[accent])}>{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
    </Card>
  )
}
