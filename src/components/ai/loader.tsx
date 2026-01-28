'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface LoaderProps {
  className?: string
  text?: string
  rotatingTexts?: string[]
  rotationInterval?: number
}

export function Loader({ 
  className, 
  text, 
  rotatingTexts,
  rotationInterval = 2500 
}: LoaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!rotatingTexts || rotatingTexts.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % rotatingTexts.length)
    }, rotationInterval)

    return () => clearInterval(interval)
  }, [rotatingTexts, rotationInterval])

  const displayText = rotatingTexts ? rotatingTexts[currentIndex] : (text || 'Denkt nach...')

  return (
    <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-current rounded-full animate-pulse" />
      </div>
      {displayText && <span className="text-sm">{displayText}</span>}
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-1 py-2">
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
    </div>
  )
}
