'use client'

import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'

interface MessageProps {
  role: 'user' | 'assistant'
  children: React.ReactNode
  className?: string
}

export function Message({ role, children, className }: MessageProps) {
  return (
    <div
      className={cn(
        'flex gap-3 py-3',
        role === 'user' && 'flex-row-reverse',
        className
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          role === 'assistant' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground'
        )}
      >
        {role === 'assistant' ? (
          <Bot className="w-4 h-4" />
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>
      <div
        className={cn(
          'flex-1 min-w-0 px-4 py-2 rounded-lg',
          role === 'assistant' 
            ? 'bg-muted/50' 
            : 'bg-primary/10'
        )}
      >
        <div className="text-sm whitespace-pre-wrap">{children}</div>
      </div>
    </div>
  )
}

interface MessageGroupProps {
  children: React.ReactNode
  className?: string
}

export function MessageGroup({ children, className }: MessageGroupProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {children}
    </div>
  )
}
