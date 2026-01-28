'use client'

import { cn } from '@/lib/utils'

interface LoaderProps {
  className?: string
  text?: string
}

export function Loader({ className, text = 'Denkt nach...' }: LoaderProps) {
  return (
    <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
      </div>
      {text && <span className="text-sm">{text}</span>}
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-1 py-2">
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
    </div>
  )
}
