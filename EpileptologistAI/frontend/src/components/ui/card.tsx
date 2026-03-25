import React from 'react'
import { cn } from '../../lib/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'cyan' | 'green' | 'red' | 'none'
}

export function Card({ children, className, glow = 'none' }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-surface border border-gray-800/50 p-6',
        glow === 'cyan' && 'glow-cyan',
        glow === 'green' && 'glow-green',
        glow === 'red' && 'glow-red',
        className
      )}
    >
      {children}
    </div>
  )
}
