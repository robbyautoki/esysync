'use client'

import { useState, useRef, useEffect, KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendHorizontal, Loader2 } from 'lucide-react'

interface PromptInputProps {
  onSubmit: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  actions?: ReactNode
}

export function PromptInput({ 
  onSubmit, 
  placeholder = 'Nachricht eingeben...', 
  disabled = false,
  loading = false,
  className,
  actions
}: PromptInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    <div className={cn('border rounded-xl bg-background shadow-sm', className)}>
      <div className="flex items-end gap-2 p-3">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading}
          className="min-h-[44px] max-h-[200px] resize-none border-0 focus-visible:ring-0 shadow-none p-0"
          rows={1}
        />
        <Button 
          onClick={handleSubmit}
          disabled={!value.trim() || disabled || loading}
          size="icon"
          className="flex-shrink-0 h-9 w-9 rounded-lg"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <SendHorizontal className="w-4 h-4" />
          )}
        </Button>
      </div>
      {actions && (
        <div className="flex items-center gap-1 px-3 pb-3 pt-0 border-t-0">
          {actions}
        </div>
      )}
    </div>
  )
}
