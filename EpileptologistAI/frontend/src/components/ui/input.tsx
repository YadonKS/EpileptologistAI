import React from 'react'
import { cn } from '../../lib/cn'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'block w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50',
        'transition-colors duration-200',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
