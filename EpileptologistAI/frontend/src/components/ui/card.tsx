import React from 'react'
import { cn } from '../../lib/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'accent' | 'green' | 'red' | 'none'
  /** Shallow 3D: perspective + hover tilt/lift (CSS only). */
  elevated?: boolean
}

export function Card({ children, className, glow = 'none', elevated = false }: CardProps) {
  const surface = (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.07] bg-surface/95 p-6 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.88)] ring-1 ring-inset ring-white/[0.03]',
        elevated && 'bg-gradient-to-b from-white/[0.06] to-surface/95',
        glow === 'accent' && 'glow-accent',
        glow === 'green' && 'glow-green',
        glow === 'red' && 'glow-red',
        className
      )}
    >
      {children}
    </div>
  )

  if (!elevated) {
    return surface
  }

  return (
    <div className="group/card [perspective:1100px] [transform-style:preserve-3d]">
      <div
        className={cn(
          'transform-gpu transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform',
          'group-hover/card:-translate-y-2 group-hover/card:[transform:translateZ(22px)_rotateX(4deg)_rotateY(-7deg)]',
          'group-hover/card:shadow-[0_40px_72px_-36px_rgba(124,58,237,0.28)]'
        )}
      >
        {surface}
      </div>
    </div>
  )
}
