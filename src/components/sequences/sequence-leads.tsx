'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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
              <span className="w-24 text-center">Fortschritt</span>
              <span className="w-24 text-center">Status</span>
            </div>

            {/* Leads */}
            {leads.map((lead) => {
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
                    >
                      {lead.firstName}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">
                      {lead.email}
                    </p>
                  </div>
                  <div className="w-24 text-center text-sm">
                    {lead.currentStep}/{lead.totalSteps}
                  </div>
                  <div className="w-24 text-center">
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
