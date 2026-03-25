import React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from './button'
import { cn } from '../../lib/cn'
import { X } from 'lucide-react'

export interface DialogProps {
  triggerText?: string
  children?: React.ReactNode
}

export function Dialog({ triggerText = 'Open', children }: DialogProps){
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button>{triggerText}</Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn('fixed inset-0 bg-black/50')} />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'bg-white rounded-md p-6 shadow-lg'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="text-lg font-semibold" />
            <DialogPrimitive.Close asChild>
              <button className="text-slate-500 hover:text-slate-700 rounded-md">
                <X size={18} />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="mt-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
