'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ArrowDown } from 'lucide-react'

interface ConversationProps {
  children: React.ReactNode
  className?: string
  autoScroll?: boolean
}

export function Conversation({ children, className, autoScroll = true }: ConversationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [children, autoScroll])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={cn('relative h-full', className)}>
      <div 
        ref={containerRef}
        className="h-full overflow-y-auto px-4"
      >
        {children}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

interface ConversationContentProps {
  children: React.ReactNode
  className?: string
}

export function ConversationContent({ children, className }: ConversationContentProps) {
  return (
    <div className={cn('space-y-2 py-4', className)}>
      {children}
    </div>
  )
}
