'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'
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
import { MoreHorizontal, Edit, Trash2, Copy, FolderInput, Folder, FolderMinus } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Sequence {
  id: string
  name: string
  isActive: boolean
  folderId?: string | null
}

interface SequenceFolder {
  id: string
  name: string
}

interface SequenceActionsProps {
  sequence: Sequence
  folders?: SequenceFolder[]
  onMoveToFolder?: (folderId: string | null) => void
}

export function SequenceActions({ sequence, folders = [], onMoveToFolder }: SequenceActionsProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/sequences/${sequence.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Löschen')
      
      toast.success('Sequenz gelöscht')
      router.refresh()
    } catch {
      toast.error('Sequenz konnte nicht gelöscht werden')
    }
    setDeleteDialogOpen(false)
  }

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/sequences/${sequence.id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error('Fehler beim Duplizieren')
      
      toast.success('Sequenz dupliziert')
      router.refresh()
    } catch {
      toast.error('Sequenz konnte nicht dupliziert werden')
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/sequences/${sequence.id}`}>
              <Edit className="mr-2 h-4 w-4" />
              Bearbeiten
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplizieren
          </DropdownMenuItem>
          {onMoveToFolder && folders.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="mr-2 h-4 w-4" />
                In Ordner verschieben
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {sequence.folderId && (
                    <>
                      <DropdownMenuItem onClick={() => onMoveToFolder(null)}>
                        <FolderMinus className="mr-2 h-4 w-4" />
                        Aus Ordner entfernen
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {folders.map(folder => (
                    <DropdownMenuItem 
                      key={folder.id}
                      onClick={() => onMoveToFolder(folder.id)}
                      disabled={folder.id === sequence.folderId}
                    >
                      <Folder className="mr-2 h-4 w-4" />
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sequenz löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Sequenz "{sequence.name}" wird dauerhaft gelöscht. 
              Alle Leads in dieser Sequenz werden gestoppt.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
