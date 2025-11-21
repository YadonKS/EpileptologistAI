import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const inputVariants = cva('block w-full rounded-md border focus:outline-none focus:ring-2', {
  variants: {
    variant: {
      default: 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400',
      subtle: 'border-transparent bg-slate-100'
    },
    size: {
      default: 'py-2 px-3',
      sm: 'py-1 px-2 text-sm',
      lg: 'py-3 px-4 text-lg'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'default'
  }
})

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: 'default' | 'subtle'
  size?: 'default' | 'sm' | 'lg'
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, variant, size, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(inputVariants({ variant, size }), className)}
      {...props}
    />
  )
})
Input.displayName = 'Input'
