'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function ManualSendButton() {
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<{ processed: number; errors: number } | null>(null)

  const handleSend = async () => {
    setLoading(true)
    setLastResult(null)

    try {
      const res = await fetch('/api/cron/process-sequences', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'your-random-secret-here'}`
        }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Senden')
      }

      setLastResult({ processed: data.processed, errors: data.errors })
      
      if (data.processed > 0) {
        toast.success(`${data.processed} E-Mail${data.processed !== 1 ? 's' : ''} versendet!`)
      } else {
        toast.info('Keine E-Mails zum Versenden')
      }
    } catch (error: any) {
      toast.error(error.message || 'Versand fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={handleSend} disabled={loading} variant="outline">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Wird verarbeitet...' : 'Jetzt senden'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Verarbeitet alle fälligen Sequenz-Steps und sendet E-Mails
        </TooltipContent>
      </Tooltip>

      {lastResult && (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          {lastResult.processed} verarbeitet
          {lastResult.errors > 0 && `, ${lastResult.errors} Fehler`}
        </span>
      )}
    </div>
  )
}
