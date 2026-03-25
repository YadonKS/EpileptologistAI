import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-brand-500 text-white hover:bg-brand-400 shadow-lg shadow-brand-500/20',
        ghost: 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5',
        outline: 'border border-slate-700 text-slate-300 hover:bg-white/5 hover:border-slate-600',
        danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
        success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20',
      },
      size: {
        default: 'h-10 px-5 text-sm',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost' | 'outline' | 'danger' | 'success'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'
