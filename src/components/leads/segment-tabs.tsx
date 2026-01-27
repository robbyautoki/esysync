'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Plus, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Segment {
  id: string
  name: string
  description: string | null
  color: string | null
  leadCount: number
}

interface SegmentTabsProps {
  segments: Segment[]
  totalLeads: number
}

export function SegmentTabs({ segments, totalLeads }: SegmentTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentSegment = searchParams.get('segment')

  const [createOpen, setCreateOpen] = useState(false)
  const [editSegment, setEditSegment] = useState<Segment | null>(null)
  const [deleteSegment, setDeleteSegment] = useState<Segment | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const setSegmentFilter = (segmentId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (segmentId) {
      params.set('segment', segmentId)
    } else {
      params.delete('segment')
    }
    // Reset page when changing segment
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null })
      })

      if (!res.ok) throw new Error('Fehler beim Erstellen')

      toast.success('Segment erstellt')
      setCreateOpen(false)
      setName('')
      setDescription('')
      router.refresh()
    } catch {
      toast.error('Segment konnte nicht erstellt werden')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!editSegment || !name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/segments/${editSegment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null })
      })

      if (!res.ok) throw new Error('Fehler beim Aktualisieren')

      toast.success('Segment aktualisiert')
      setEditSegment(null)
      setName('')
      setDescription('')
      router.refresh()
    } catch {
      toast.error('Segment konnte nicht aktualisiert werden')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteSegment) return

    setLoading(true)
    try {
      const res = await fetch(`/api/segments/${deleteSegment.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Fehler beim Löschen')

      toast.success('Segment gelöscht')
      setDeleteSegment(null)

      // Wenn das gelöschte Segment aktiv war, Filter entfernen
      if (currentSegment === deleteSegment.id) {
        setSegmentFilter(null)
      }

      router.refresh()
    } catch {
      toast.error('Segment konnte nicht gelöscht werden')
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (segment: Segment) => {
    setName(segment.name)
    setDescription(segment.description || '')
    setEditSegment(segment)
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Alle Leads Tab */}
        <Button
          variant={!currentSegment ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSegmentFilter(null)}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Alle Leads
          <Badge variant="secondary" className="ml-1">
            {totalLeads}
          </Badge>
        </Button>

        {/* Segment Tabs */}
        {segments.map((segment) => (
          <DropdownMenu key={segment.id}>
            <div className="flex">
              <Button
                variant={currentSegment === segment.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSegmentFilter(segment.id)}
                className={cn(
                  "gap-2 rounded-r-none border-r-0",
                  segment.color && currentSegment === segment.id && "ring-2 ring-offset-1"
                )}
                style={segment.color ? { borderColor: segment.color } : undefined}
              >
                {segment.color && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                )}
                {segment.name}
                <Badge variant="secondary" className="ml-1">
                  {segment.leadCount}
                </Badge>
              </Button>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={currentSegment === segment.id ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-l-none px-2"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(segment)}>
                <Pencil className="mr-2 h-4 w-4" />
                Umbenennen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteSegment(segment)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        {/* Neues Segment Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Segment
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Segment erstellen</DialogTitle>
            <DialogDescription>
              Erstelle ein Segment um Leads zu gruppieren
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="segment-name">Name *</Label>
              <Input
                id="segment-name"
                placeholder="z.B. Newsletter-Abonnenten"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment-desc">Beschreibung (optional)</Label>
              <Input
                id="segment-desc"
                placeholder="Kurze Beschreibung des Segments"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={loading || !name.trim()}>
              {loading ? 'Erstelle...' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editSegment} onOpenChange={(open) => !open && setEditSegment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Segment bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-segment-name">Name *</Label>
              <Input
                id="edit-segment-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-segment-desc">Beschreibung (optional)</Label>
              <Input
                id="edit-segment-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSegment(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleEdit} disabled={loading || !name.trim()}>
              {loading ? 'Speichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSegment} onOpenChange={(open) => !open && setDeleteSegment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Segment löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Segment "{deleteSegment?.name}" wird gelöscht. Die zugeordneten Leads bleiben erhalten,
              werden aber aus diesem Segment entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Löscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
