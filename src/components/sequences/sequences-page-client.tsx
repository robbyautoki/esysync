'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SequenceTable } from './sequence-table'
import { FolderAccordion } from './folder-accordion'
import { SequenceAnalyticsSheet } from './sequence-analytics-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Trash2, X, AlertTriangle, Loader2, FolderPlus } from 'lucide-react'
import { toast } from 'sonner'

interface SequenceFolder {
  id: string
  name: string
  color: string | null
  order: number
}

interface Sequence {
  id: string
  name: string
  isActive: boolean
  trigger: string
  color: string | null
  folderId: string | null
  folder: { id: string; name: string; color: string | null } | null
  createdAt: Date
  steps: { type: string }[]
  _count: { states: number }
}

interface SequencesPageClientProps {
  sequences: Sequence[]
  folders: SequenceFolder[]
}

interface DeleteInfo {
  count: number
  activeCount: number
  totalLeadsAffected: number
}

export function SequencesPageClient({ sequences, folders }: SequencesPageClientProps) {
  const router = useRouter()
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteInfo, setDeleteInfo] = useState<DeleteInfo | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingInfo, setIsLoadingInfo] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      const res = await fetch('/api/sequences/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() })
      })
      if (!res.ok) throw new Error('Fehler beim Erstellen')
      toast.success('Ordner erstellt')
      setFolderDialogOpen(false)
      setNewFolderName('')
      router.refresh()
    } catch {
      toast.error('Ordner konnte nicht erstellt werden')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleUpdateSequenceColor = async (sequenceId: string, color: string | null) => {
    try {
      const res = await fetch(`/api/sequences/${sequenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color })
      })
      if (!res.ok) throw new Error('Fehler')
      router.refresh()
    } catch {
      toast.error('Farbe konnte nicht geändert werden')
    }
  }

  const handleUpdateSequenceFolder = async (sequenceId: string, folderId: string | null) => {
    try {
      const res = await fetch(`/api/sequences/${sequenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      })
      if (!res.ok) throw new Error('Fehler')
      router.refresh()
    } catch {
      toast.error('Ordner konnte nicht geändert werden')
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const res = await fetch('/api/sequences/folders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: folderId })
      })
      if (!res.ok) throw new Error('Fehler')
      toast.success('Ordner gelöscht')
      router.refresh()
    } catch {
      toast.error('Ordner konnte nicht gelöscht werden')
    }
  }

  const handleRenameFolder = async (folderId: string, name: string) => {
    try {
      const res = await fetch('/api/sequences/folders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: folderId, name })
      })
      if (!res.ok) throw new Error('Fehler')
      router.refresh()
    } catch {
      toast.error('Ordner konnte nicht umbenannt werden')
    }
  }

  // Sequences without folder
  const unfolderedSequences = useMemo(() => {
    return sequences.filter(s => !s.folderId)
  }, [sequences])

  return (
    <>
      {/* Actions Bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFolderDialogOpen(true)}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Neuer Ordner
          </Button>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-2 bg-muted rounded-lg border">
            <span className="text-sm font-medium">
              {selectedIds.length} ausgewählt
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              <X className="h-4 w-4 mr-1" />
              Aufheben
            </Button>
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
      </div>

      <div className="space-y-6">
        {/* Folders Section */}
        {folders.length > 0 && (
          <FolderAccordion
            folders={folders}
            sequences={sequences}
            onUpdateColor={handleUpdateSequenceColor}
            onUpdateFolder={handleUpdateSequenceFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
            onOpenAnalytics={handleOpenAnalytics}
          />
        )}

        {/* Unfoldered Sequences */}
        {unfolderedSequences.length > 0 && (
          <div>
            {folders.length > 0 && (
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                Sequenzen ohne Ordner
              </h3>
            )}
            <SequenceTable
              sequences={unfolderedSequences}
              folders={folders}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onOpenAnalytics={handleOpenAnalytics}
              onUpdateColor={handleUpdateSequenceColor}
              onUpdateFolder={handleUpdateSequenceFolder}
            />
          </div>
        )}
      </div>

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

      {/* Create Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Ordner</DialogTitle>
            <DialogDescription>
              Erstelle einen Ordner um deine Sequenzen zu organisieren.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Ordnername"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder}>
              {creatingFolder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstellen...
                </>
              ) : (
                'Erstellen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
