'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Trash2, Users, RotateCcw, Plus, Tag, Search, ChevronRight } from 'lucide-react'

const VISIBLE_LEADS = 5
const FADED_LEADS = 2
import { toast } from 'sonner'
import Link from 'next/link'
import { SegmentSelect } from '@/components/segments/segment-select'

interface Lead {
  id: string
  email: string
  firstName: string
  status: string
  currentStep: number
  totalSteps: number
  startedAt: string
  nextRunAt: string | null
  completedAt: string | null
}

interface SequenceLeadsProps {
  sequenceId: string
}

export function SequenceLeads({ sequenceId }: SequenceLeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [removing, setRemoving] = useState(false)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [addSegmentOpen, setAddSegmentOpen] = useState(false)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [addingSegment, setAddingSegment] = useState(false)
  const [search, setSearch] = useState('')
  const [showAllModal, setShowAllModal] = useState(false)

  // Gefilterte Leads basierend auf Suche
  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads
    const searchLower = search.toLowerCase()
    return leads.filter(lead => 
      lead.email.toLowerCase().includes(searchLower) ||
      lead.firstName.toLowerCase().includes(searchLower)
    )
  }, [leads, search])

  // Leads für Kompaktansicht
  const displayedLeads = useMemo(() => {
    if (search.trim()) return filteredLeads // Bei Suche alle gefilterten zeigen
    return filteredLeads.slice(0, VISIBLE_LEADS + FADED_LEADS)
  }, [filteredLeads, search])

  const remainingCount = leads.length - VISIBLE_LEADS - FADED_LEADS

  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/leads`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data)
      }
    } catch {
      toast.error('Fehler beim Laden der Leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [sequenceId])

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)))
    }
  }

  const removeSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`${selectedIds.size} Lead(s) wirklich aus der Sequenz entfernen?`)) return

    setRemoving(true)
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/leads`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) })
      })

      if (!res.ok) throw new Error('Fehler beim Entfernen')

      const result = await res.json()
      toast.success(`${result.removed} Lead(s) entfernt`)
      setSelectedIds(new Set())
      fetchLeads()
    } catch {
      toast.error('Fehler beim Entfernen')
    } finally {
      setRemoving(false)
    }
  }

  const resetLead = async (leadId: string) => {
    setResettingId(leadId)
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/leads/${leadId}`, {
        method: 'PUT'
      })

      if (!res.ok) throw new Error('Fehler beim Zurücksetzen')

      toast.success('Lead zurückgesetzt')
      fetchLeads()
    } catch {
      toast.error('Fehler beim Zurücksetzen')
    } finally {
      setResettingId(null)
    }
  }

  const addSegmentLeads = async () => {
    if (!selectedSegmentId) return

    setAddingSegment(true)
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/leads/from-segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId: selectedSegmentId })
      })

      if (!res.ok) throw new Error('Fehler beim Hinzufügen')

      const result = await res.json()
      toast.success(`${result.added} Lead(s) hinzugefügt${result.skipped > 0 ? `, ${result.skipped} bereits in Sequenz` : ''}`)
      setAddSegmentOpen(false)
      setSelectedSegmentId(null)
      fetchLeads()
    } catch {
      toast.error('Fehler beim Hinzufügen der Segment-Leads')
    } finally {
      setAddingSegment(false)
    }
  }

  const statusLabels: Record<string, { label: string; variant: 'success' | 'secondary' | 'destructive' }> = {
    ACTIVE: { label: 'Aktiv', variant: 'success' },
    COMPLETED: { label: 'Abgeschlossen', variant: 'secondary' },
    STOPPED_BOUNCE: { label: 'Bounce', variant: 'destructive' },
    UNSUBSCRIBED: { label: 'Abgemeldet', variant: 'secondary' }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Leads in dieser Sequenz
            </CardTitle>
            <CardDescription>{leads.length} Lead(s)</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Suche */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Lead suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-40 h-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddSegmentOpen(true)}
            >
              <Tag className="h-4 w-4 mr-2" />
              Segment hinzufügen
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={removeSelected}
                disabled={removing}
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {selectedIds.size} entfernen
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Keine Leads in dieser Sequenz</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground border-b">
              <Checkbox 
                checked={selectedIds.size === leads.length && leads.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="flex-1">Lead</span>
              <span className="w-20 text-center">Fortschritt</span>
              <span className="w-28 text-center">Status</span>
              <span className="w-20"></span>
            </div>

            {/* Leads */}
            {displayedLeads.map((lead, index) => {
              const status = statusLabels[lead.status] || { label: lead.status, variant: 'secondary' as const }
              const isFaded = !search.trim() && index >= VISIBLE_LEADS
              
              return (
                <div 
                  key={lead.id} 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-opacity ${
                    isFaded 
                      ? 'opacity-40 pointer-events-none' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox 
                    checked={selectedIds.has(lead.id)}
                    onCheckedChange={() => toggleSelect(lead.id)}
                    disabled={isFaded}
                  />
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/leads/${lead.id}`}
                      className="font-medium hover:underline"
                    >
                      {lead.firstName}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">
                      {lead.email}
                    </p>
                  </div>
                  <div className="w-20 text-center text-sm">
                    {lead.currentStep}/{lead.totalSteps}
                  </div>
                  <div className="w-28 text-center">
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  </div>
                  <div className="w-20 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetLead(lead.id)}
                      disabled={resettingId === lead.id || isFaded}
                      title="Zurücksetzen"
                    >
                      {resettingId === lead.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}

            {/* Alle anzeigen Button */}
            {!search.trim() && remainingCount > 0 && (
              <Button
                variant="ghost"
                className="w-full mt-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllModal(true)}
              >
                +{remainingCount} weitere anzeigen
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {/* Keine Ergebnisse bei Suche */}
            {search.trim() && filteredLeads.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Keine Leads gefunden für "{search}"
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add Segment Dialog */}
      <Dialog open={addSegmentOpen} onOpenChange={setAddSegmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Segment-Leads hinzufügen</DialogTitle>
            <DialogDescription>
              Füge alle Leads eines Segments zu dieser Sequenz hinzu.
              Leads die bereits in der Sequenz sind werden übersprungen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <SegmentSelect
              value={selectedSegmentId}
              onChange={setSelectedSegmentId}
              placeholder="Segment auswählen"
              allowCreate={false}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddSegmentOpen(false)
                setSelectedSegmentId(null)
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={addSegmentLeads}
              disabled={!selectedSegmentId || addingSegment}
            >
              {addingSegment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Füge hinzu...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Leads hinzufügen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alle Leads Modal */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alle Leads ({leads.length})
            </DialogTitle>
            <DialogDescription>
              Vollständige Liste aller Leads in dieser Sequenz
            </DialogDescription>
          </DialogHeader>
          
          {/* Suche im Modal */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Lead suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {filteredLeads.map((lead) => {
                const status = statusLabels[lead.status] || { label: lead.status, variant: 'secondary' as const }
                
                return (
                  <div 
                    key={lead.id} 
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox 
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/leads/${lead.id}`}
                        className="font-medium hover:underline"
                        onClick={() => setShowAllModal(false)}
                      >
                        {lead.firstName}
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.email}
                      </p>
                    </div>
                    <div className="w-16 text-center text-sm">
                      {lead.currentStep}/{lead.totalSteps}
                    </div>
                    <Badge variant={status.variant} className="w-24 justify-center">
                      {status.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetLead(lead.id)}
                      disabled={resettingId === lead.id}
                      title="Zurücksetzen"
                    >
                      {resettingId === lead.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )
              })}
              
              {search.trim() && filteredLeads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Leads gefunden für "{search}"
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => {
                  removeSelected()
                  setShowAllModal(false)
                }}
                disabled={removing}
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {selectedIds.size} entfernen
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAllModal(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
