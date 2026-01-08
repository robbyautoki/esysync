'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface RemoveFromSequenceButtonProps {
  leadId: string
  sequenceId: string
  sequenceName: string
}

export function RemoveFromSequenceButton({ 
  leadId, 
  sequenceId, 
  sequenceName 
}: RemoveFromSequenceButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRemove = async () => {
    if (!confirm(`Lead wirklich aus "${sequenceName}" entfernen?`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/leads/${leadId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Fehler beim Entfernen')

      toast.success(`Aus "${sequenceName}" entfernt`)
      router.refresh()
    } catch {
      toast.error('Fehler beim Entfernen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={handleRemove}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <X className="h-4 w-4" />
      )}
    </Button>
  )
}
