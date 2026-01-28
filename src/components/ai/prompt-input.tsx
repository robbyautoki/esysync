'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'

interface PromptInputProps {
  onSubmit: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function PromptInput({ 
  onSubmit, 
  placeholder = 'Nachricht eingeben...', 
  disabled = false,
  loading = false,
  className 
}: PromptInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

  const handleSubmit = () => {
    if (!value.trim() || disabled || loading) return
    onSubmit(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={cn('flex gap-2 items-end p-4 border-t bg-background', className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
        className="min-h-[44px] max-h-[200px] resize-none"
        rows={1}
      />
      <Button 
        onClick={handleSubmit}
        disabled={!value.trim() || disabled || loading}
        size="icon"
        className="flex-shrink-0"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </div>
  )
}
