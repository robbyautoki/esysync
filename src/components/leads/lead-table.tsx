'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Mail,
  Tag,
  Loader2
} from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { AddToSequenceModal } from './add-to-sequence-modal'

interface Lead {
  id: string
  email: string
  firstName: string
  status: 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED'
  score: number
  createdAt: Date
  _count: {
    events: number
    sequenceStates: number
  }
  segments?: {
    segment: {
      id: string
      name: string
      color: string | null
    }
  }[]
}

interface LeadTableProps {
  leads: Lead[]
  total: number
  page: number
  totalPages: number
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }> = {
  ACTIVE: { label: 'Aktiv', variant: 'success' },
  UNSUBSCRIBED: { label: 'Abgemeldet', variant: 'secondary' },
  BOUNCED: { label: 'Bounced', variant: 'destructive' }
}

export function LeadTable({ leads, total, page, totalPages }: LeadTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sequenceModalOpen, setSequenceModalOpen] = useState(false)
  const [sequenceLeadIds, setSequenceLeadIds] = useState<string[]>([])
  const [segmentConfirmOpen, setSegmentConfirmOpen] = useState(false)
  const [segmentLeadIds, setSegmentLeadIds] = useState<string[]>([])
  const [selectedSegment, setSelectedSegment] = useState<{ id: string; name: string } | null>(null)
  const [addingToSegment, setAddingToSegment] = useState(false)
  const [segments, setSegments] = useState<{ id: string; name: string; color: string | null }[]>([])
  const [segmentsLoading, setSegmentsLoading] = useState(false)

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearchParams({ search: search || null, page: '1' })
  }

  const handleStatusFilter = (status: string) => {
    updateSearchParams({ status: status === 'all' ? null : status, page: '1' })
  }

  const handleSort = (column: string) => {
    const currentSort = searchParams.get('sort')
    const currentOrder = searchParams.get('order')
    
    let newOrder = 'asc'
    if (currentSort === column && currentOrder === 'asc') {
      newOrder = 'desc'
    }
    
    updateSearchParams({ sort: column, order: newOrder })
  }

  const toggleAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(leads.map(l => l.id))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Löschen')
      toast.success('Lead wurde gelöscht')
      router.refresh()
    } catch {
      toast.error('Lead konnte nicht gelöscht werden')
    }
    setDeleteDialogOpen(false)
    setDeletingId(null)
  }

  const handleBulkDelete = async () => {
    try {
      const res = await fetch('/api/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      })
      if (!res.ok) throw new Error('Fehler beim Löschen')
      toast.success(`${selectedIds.length} Leads wurden gelöscht`)
      setSelectedIds([])
      router.refresh()
    } catch {
      toast.error('Leads konnten nicht gelöscht werden')
    }
    setDeleteDialogOpen(false)
  }

  const fetchSegments = async () => {
    if (segments.length > 0) return // Already loaded
    setSegmentsLoading(true)
    try {
      const res = await fetch('/api/segments')
      if (res.ok) {
        const data = await res.json()
        setSegments(data.segments || [])
      }
    } catch {
      console.error('Fehler beim Laden der Segmente')
    } finally {
      setSegmentsLoading(false)
    }
  }

  const handleSegmentSelect = (segment: { id: string; name: string }, leadIds: string[]) => {
    setSelectedSegment(segment)
    setSegmentLeadIds(leadIds)
    setSegmentConfirmOpen(true)
  }

  const handleAddToSegment = async () => {
    if (!selectedSegment || segmentLeadIds.length === 0) return

    setAddingToSegment(true)
    try {
      const res = await fetch(`/api/segments/${selectedSegment.id}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: segmentLeadIds })
      })

      if (!res.ok) throw new Error('Fehler beim Hinzufügen')

      const result = await res.json()
      toast.success(`${result.added} Lead(s) zu "${selectedSegment.name}" hinzugefügt${result.skipped > 0 ? `, ${result.skipped} bereits im Segment` : ''}`)
      setSegmentConfirmOpen(false)
      setSelectedSegment(null)
      setSegmentLeadIds([])
      setSelectedIds([])
      router.refresh()
    } catch {
      toast.error('Leads konnten nicht zum Segment hinzugefügt werden')
    } finally {
      setAddingToSegment(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nach E-Mail oder Name suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Suchen</Button>
        </form>

        <Select 
          value={searchParams.get('status') || 'all'} 
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="ACTIVE">Aktiv</SelectItem>
            <SelectItem value="UNSUBSCRIBED">Abgemeldet</SelectItem>
            <SelectItem value="BOUNCED">Bounced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} ausgewählt
          </span>
          <DropdownMenu onOpenChange={(open) => open && fetchSegments()}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Tag className="mr-2 h-4 w-4" />
                Zu Segment ({selectedIds.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {segmentsLoading ? (
                <div className="flex items-center justify-center py-2 px-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Lädt...</span>
                </div>
              ) : segments.length === 0 ? (
                <div className="py-2 px-4 text-sm text-muted-foreground">
                  Keine Segmente vorhanden
                </div>
              ) : (
                segments.map(segment => (
                  <DropdownMenuItem
                    key={segment.id}
                    onClick={() => handleSegmentSelect(segment, selectedIds)}
                  >
                    {segment.color && (
                      <span
                        className="h-2 w-2 rounded-full mr-2"
                        style={{ backgroundColor: segment.color }}
                      />
                    )}
                    {segment.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {(() => {
            const activeSelectedIds = selectedIds.filter(id => {
              const lead = leads.find(l => l.id === id)
              return lead && lead.status !== 'UNSUBSCRIBED'
            })
            return activeSelectedIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSequenceLeadIds(activeSelectedIds)
                  setSequenceModalOpen(true)
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                Zu Sequenz ({activeSelectedIds.length})
              </Button>
            )
          })()}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeletingId(null)
              setDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={leads.length > 0 && selectedIds.length === leads.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="-ml-3"
                      onClick={() => handleSort('email')}
                    >
                      E-Mail
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Klicken zum Sortieren</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="-ml-3"
                      onClick={() => handleSort('firstName')}
                    >
                      Vorname
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Klicken zum Sortieren</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="-ml-3"
                      onClick={() => handleSort('score')}
                    >
                      Score
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Engagement-Score (Opens +5, Clicks +10)</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead>
                <Tooltip>
                  <TooltipTrigger>Sequenzen</TooltipTrigger>
                  <TooltipContent>Anzahl der aktiven Sequenzen</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="-ml-3"
                      onClick={() => handleSort('createdAt')}
                    >
                      Erstellt
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Klicken zum Sortieren</TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <p className="text-muted-foreground">Keine Leads gefunden</p>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const isEsySync = lead.segments?.some(s => s.segment.id === 'esysync')
                return (
                <TableRow 
                  key={lead.id}
                  className={isEsySync ? 'bg-purple-50/50 border-l-2 border-l-purple-400' : ''}
                >
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.includes(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {lead.email}
                      {isEsySync && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                          esysync
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{lead.firstName}</TableCell>
                  <TableCell>
                    <Badge variant={statusLabels[lead.status].variant}>
                      {statusLabels[lead.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={lead.score > 20 ? 'text-green-600 font-medium' : lead.score > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                      {lead.score}
                    </span>
                  </TableCell>
                  <TableCell>{lead._count.sequenceStates}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeDate(lead.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/leads/${lead.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Details anzeigen
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger onPointerEnter={fetchSegments}>
                            <Tag className="mr-2 h-4 w-4" />
                            Zu Segment hinzufügen
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {segmentsLoading ? (
                              <div className="flex items-center justify-center py-2 px-4">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span className="text-sm">Lädt...</span>
                              </div>
                            ) : segments.length === 0 ? (
                              <div className="py-2 px-4 text-sm text-muted-foreground">
                                Keine Segmente
                              </div>
                            ) : (
                              segments.map(segment => (
                                <DropdownMenuItem
                                  key={segment.id}
                                  onClick={() => handleSegmentSelect(segment, [lead.id])}
                                >
                                  {segment.color && (
                                    <span
                                      className="h-2 w-2 rounded-full mr-2"
                                      style={{ backgroundColor: segment.color }}
                                    />
                                  )}
                                  {segment.name}
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {lead.status !== 'UNSUBSCRIBED' && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSequenceLeadIds([lead.id])
                              setSequenceModalOpen(true)
                            }}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Zu Sequenz hinzufügen
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setDeletingId(lead.id)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} Lead{total !== 1 ? 's' : ''} insgesamt
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateSearchParams({ page: String(page - 1) })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Seite {page} von {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updateSearchParams({ page: String(page + 1) })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingId ? 'Lead löschen?' : `${selectedIds.length} Leads löschen?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. 
              {deletingId 
                ? ' Der Lead und alle zugehörigen Daten werden dauerhaft gelöscht.'
                : ` Alle ${selectedIds.length} ausgewählten Leads werden dauerhaft gelöscht.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId ? handleDelete(deletingId) : handleBulkDelete()}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add to Sequence Modal */}
      <AddToSequenceModal
        open={sequenceModalOpen}
        onOpenChange={setSequenceModalOpen}
        leadIds={sequenceLeadIds}
        onSuccess={() => setSelectedIds([])}
      />

      {/* Add to Segment Confirmation */}
      <AlertDialog open={segmentConfirmOpen} onOpenChange={(open) => {
        setSegmentConfirmOpen(open)
        if (!open) {
          setSelectedSegment(null)
          setSegmentLeadIds([])
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zu Segment hinzufügen?</AlertDialogTitle>
            <AlertDialogDescription>
              {segmentLeadIds.length === 1
                ? `Möchtest du diesen Lead zum Segment "${selectedSegment?.name}" hinzufügen?`
                : `Möchtest du ${segmentLeadIds.length} Leads zum Segment "${selectedSegment?.name}" hinzufügen?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={addingToSegment}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddToSegment}
              disabled={addingToSegment}
            >
              {addingToSegment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Füge hinzu...
                </>
              ) : (
                'Hinzufügen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
