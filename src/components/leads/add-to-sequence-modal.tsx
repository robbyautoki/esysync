'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

interface Sequence {
  id: string
  name: string
  isActive: boolean
  _count?: { steps: number }
}

interface AddToSequenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadIds: string[]
  onSuccess?: () => void
}

export function AddToSequenceModal({ open, onOpenChange, leadIds, onSuccess }: AddToSequenceModalProps) {
  const router = useRouter()
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [selectedSequence, setSelectedSequence] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingSequences, setLoadingSequences] = useState(true)

  useEffect(() => {
    if (open) {
      fetchSequences()
    }
  }, [open])

  const fetchSequences = async () => {
    setLoadingSequences(true)
    try {
      const res = await fetch('/api/sequences')
      const data = await res.json()
      setSequences(data.sequences || [])
    } catch {
      toast.error('Sequenzen konnten nicht geladen werden')
    } finally {
      setLoadingSequences(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedSequence) {
      toast.error('Bitte eine Sequenz auswählen')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/sequences/${selectedSequence}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Fehler beim Hinzufügen')
      }

      toast.success(`${data.added} Lead${data.added !== 1 ? 's' : ''} zur Sequenz hinzugefügt${data.skipped > 0 ? ` (${data.skipped} bereits enthalten)` : ''}`)
      onOpenChange(false)
      setSelectedSequence('')
      onSuccess?.()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Leads konnten nicht hinzugefügt werden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zu Sequenz hinzufügen</DialogTitle>
          <DialogDescription>
            {leadIds.length === 1 
              ? 'Füge diesen Lead zu einer E-Mail-Sequenz hinzu'
              : `Füge ${leadIds.length} Leads zu einer E-Mail-Sequenz hinzu`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Sequenz auswählen</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Der Lead startet automatisch am Anfang der Sequenz
                </TooltipContent>
              </Tooltip>
            </div>

            {loadingSequences ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sequences.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Keine Sequenzen vorhanden</p>
                <Button variant="link" size="sm" onClick={() => router.push('/sequences/new')}>
                  Erste Sequenz erstellen
                </Button>
              </div>
            ) : (
              <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                <SelectTrigger>
                  <SelectValue placeholder="Sequenz auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {sequences.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      <div className="flex items-center gap-2">
                        <span>{seq.name}</span>
                        {!seq.isActive && (
                          <span className="text-xs text-muted-foreground">(Inaktiv)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedSequence && (
            <p className="text-sm text-muted-foreground">
              Die Leads starten sofort mit dem ersten Step der Sequenz.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedSequence}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird hinzugefügt...
              </>
            ) : (
              'Hinzufügen'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
