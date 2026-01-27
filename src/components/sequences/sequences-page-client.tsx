'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SequenceTable } from './sequence-table'
import { SequenceAnalyticsSheet } from './sequence-analytics-sheet'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Sequence {
  id: string
  name: string
  isActive: boolean
  trigger: string
  createdAt: Date
  steps: { type: string }[]
  _count: { states: number }
}

interface SequencesPageClientProps {
  sequences: Sequence[]
}

interface DeleteInfo {
  count: number
  activeCount: number
  totalLeadsAffected: number
}

export function SequencesPageClient({ sequences }: SequencesPageClientProps) {
  const router = useRouter()
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteInfo, setDeleteInfo] = useState<DeleteInfo | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingInfo, setIsLoadingInfo] = useState(false)

  const handleOpenAnalytics = (sequence: Sequence) => {
    setSelectedSequence(sequence)
    setAnalyticsOpen(true)
  }

  const handleOpenDeleteDialog = async () => {
    setDeleteDialogOpen(true)
    setIsLoadingInfo(true)
    
    try {
      const res = await fetch(`/api/sequences/bulk-delete?ids=${selectedIds.join(',')}`)
      if (res.ok) {
        const info = await res.json()
        setDeleteInfo(info)
      }
    } catch (error) {
      console.error('Error fetching delete info:', error)
    } finally {
      setIsLoadingInfo(false)
    }
  }

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/sequences/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      })

      if (!res.ok) throw new Error('Fehler beim Löschen')

      const result = await res.json()
      toast.success(`${result.deleted} Sequenz${result.deleted > 1 ? 'en' : ''} gelöscht`)
      setSelectedIds([])
      setDeleteDialogOpen(false)
      router.refresh()
    } catch {
      toast.error('Sequenzen konnten nicht gelöscht werden')
    } finally {
      setIsDeleting(false)
    }
  }

  // Clear selection when sequences change
  useEffect(() => {
    setSelectedIds([])
  }, [sequences])

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="mb-4 flex items-center justify-between p-3 bg-muted rounded-lg border">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedIds.length} Sequenz{selectedIds.length > 1 ? 'en' : ''} ausgewählt
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              <X className="h-4 w-4 mr-1" />
              Auswahl aufheben
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleOpenDeleteDialog}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </Button>
        </div>
      )}

      <SequenceTable
        sequences={sequences}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onOpenAnalytics={handleOpenAnalytics}
      />

      <SequenceAnalyticsSheet
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        sequence={selectedSequence}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedIds.length} Sequenz{selectedIds.length > 1 ? 'en' : ''} löschen?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {isLoadingInfo ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Lade Informationen...
                  </div>
                ) : deleteInfo ? (
                  <>
                    {deleteInfo.activeCount > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-md">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {deleteInfo.activeCount} Sequenz{deleteInfo.activeCount > 1 ? 'en sind' : ' ist'} aktiv
                        </span>
                      </div>
                    )}
                    {deleteInfo.totalLeadsAffected > 0 && (
                      <p className="text-sm">
                        <strong>{deleteInfo.totalLeadsAffected}</strong> Lead{deleteInfo.totalLeadsAffected > 1 ? 's werden' : ' wird'} aus {deleteInfo.totalLeadsAffected > 1 ? 'den Sequenzen' : 'der Sequenz'} entfernt.
                      </p>
                    )}
                  </>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Tracking-Daten bleiben erhalten. Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Löschen...
                </>
              ) : (
                'Löschen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
