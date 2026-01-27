'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDown, Plus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Segment {
  id: string
  name: string
  description: string | null
  color: string | null
  leadCount?: number
}

interface SegmentSelectProps {
  // Für Einzelauswahl
  value?: string | null
  onChange?: (segmentId: string | null) => void
  // Für Mehrfachauswahl
  values?: string[]
  onMultiChange?: (segmentIds: string[]) => void
  // Optionen
  multiple?: boolean
  placeholder?: string
  allowCreate?: boolean
  disabled?: boolean
  className?: string
}

export function SegmentSelect({
  value,
  onChange,
  values = [],
  onMultiChange,
  multiple = false,
  placeholder = 'Segment auswählen',
  allowCreate = true,
  disabled = false,
  className
}: SegmentSelectProps) {
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    fetchSegments()
  }, [])

  const fetchSegments = async () => {
    try {
      const res = await fetch('/api/segments')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSegments(data.segments || [])
    } catch {
      console.error('Fehler beim Laden der Segmente')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Name ist erforderlich')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null
        })
      })

      if (!res.ok) throw new Error()

      const data = await res.json()
      const newSegment = data.segment

      setSegments(prev => [...prev, { ...newSegment, leadCount: 0 }])

      // Auto-select the new segment
      if (multiple) {
        onMultiChange?.([...values, newSegment.id])
      } else {
        onChange?.(newSegment.id)
      }

      toast.success('Segment erstellt')
      setCreateOpen(false)
      setNewName('')
      setNewDescription('')
    } catch {
      toast.error('Segment konnte nicht erstellt werden')
    } finally {
      setCreating(false)
    }
  }

  const handleSelect = (segmentId: string) => {
    if (multiple) {
      const newValues = values.includes(segmentId)
        ? values.filter(id => id !== segmentId)
        : [...values, segmentId]
      onMultiChange?.(newValues)
    } else {
      onChange?.(segmentId === value ? null : segmentId)
      setOpen(false)
    }
  }

  const handleClear = () => {
    if (multiple) {
      onMultiChange?.([])
    } else {
      onChange?.(null)
    }
  }

  const selectedSegments = multiple
    ? segments.filter(s => values.includes(s.id))
    : segments.find(s => s.id === value)

  const hasSelection = multiple ? values.length > 0 : !!value

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn(
              "justify-between font-normal",
              !hasSelection && "text-muted-foreground",
              className
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lädt...
              </span>
            ) : multiple ? (
              values.length > 0 ? (
                <span className="flex items-center gap-1 flex-wrap">
                  {selectedSegments && Array.isArray(selectedSegments) && selectedSegments.slice(0, 2).map(s => (
                    <Badge key={s.id} variant="secondary" className="text-xs">
                      {s.name}
                    </Badge>
                  ))}
                  {values.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{values.length - 2}
                    </Badge>
                  )}
                </span>
              ) : (
                placeholder
              )
            ) : (
              selectedSegments && !Array.isArray(selectedSegments) ? (
                <span className="flex items-center gap-2">
                  {selectedSegments.color && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: selectedSegments.color }}
                    />
                  )}
                  {selectedSegments.name}
                </span>
              ) : (
                placeholder
              )
            )}
            <div className="flex items-center gap-1 ml-2">
              {hasSelection && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                />
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-2" align="start">
          {segments.length === 0 && !allowCreate ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine Segmente vorhanden
            </p>
          ) : (
            <div className="space-y-1">
              {segments.map(segment => (
                <div
                  key={segment.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent",
                    multiple
                      ? values.includes(segment.id) && "bg-accent"
                      : value === segment.id && "bg-accent"
                  )}
                  onClick={() => handleSelect(segment.id)}
                >
                  {multiple && (
                    <Checkbox
                      checked={values.includes(segment.id)}
                      onCheckedChange={() => handleSelect(segment.id)}
                    />
                  )}
                  {segment.color && (
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: segment.color }}
                    />
                  )}
                  <span className="flex-1 text-sm truncate">{segment.name}</span>
                  {segment.leadCount !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {segment.leadCount}
                    </Badge>
                  )}
                </div>
              ))}

              {allowCreate && (
                <>
                  {segments.length > 0 && <div className="border-t my-2" />}
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent text-muted-foreground"
                    onClick={() => {
                      setOpen(false)
                      setCreateOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Neues Segment erstellen
                  </button>
                </>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>

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
              <Label htmlFor="new-segment-name">Name *</Label>
              <Input
                id="new-segment-name"
                placeholder="z.B. Newsletter-Abonnenten"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-segment-desc">Beschreibung (optional)</Label>
              <Input
                id="new-segment-desc"
                placeholder="Kurze Beschreibung des Segments"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? 'Erstelle...' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
