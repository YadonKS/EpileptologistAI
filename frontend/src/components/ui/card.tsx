import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const cardVariants = cva('rounded-lg bg-white shadow p-4', {
  variants: {
    variant: {
      default: '',
      subtle: 'bg-slate-50'
    },
    size: {
      default: '',
      sm: 'p-2',
      lg: 'p-6'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'default'
  }
})

export function Card({ children, className, variant, size }: any){
  return (
    <div className={cn(cardVariants({ variant, size }), className)}>
      {children}
    </div>
  )
}
