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
import { MoreHorizontal, Play, Pause, Edit, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Sequence {
  id: string
  name: string
  isActive: boolean
}

export function SequenceActions({ sequence }: { sequence: Sequence }) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleToggleActive = async () => {
    try {
      const res = await fetch(`/api/sequences/${sequence.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !sequence.isActive })
      })
      
      if (!res.ok) throw new Error('Fehler beim Aktualisieren')
      
      toast.success(sequence.isActive ? 'Sequenz pausiert' : 'Sequenz aktiviert')
      router.refresh()
    } catch {
      toast.error('Aktion fehlgeschlagen')
    }
  }

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
          <DropdownMenuItem onClick={handleToggleActive}>
            {sequence.isActive ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pausieren
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Aktivieren
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplizieren
          </DropdownMenuItem>
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
