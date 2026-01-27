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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
import Link from 'next/link'

interface UnsubscribeEvent {
  id: string
  leadId: string
  createdAt: Date
  metadata: Record<string, unknown> | null
  lead: {
    id: string
    email: string
    firstName: string
  }
}

interface UnsubscribeTableProps {
  events: UnsubscribeEvent[]
  total: number
  page: number
  totalPages: number
}

const REASON_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  too_many: { label: 'Zu viele E-Mails', variant: 'secondary' },
  not_relevant: { label: 'Nicht relevant', variant: 'outline' },
  never_subscribed: { label: 'Nie angemeldet', variant: 'destructive' },
  other: { label: 'Sonstiges', variant: 'default' },
}

export function UnsubscribeTable({ events, total, page, totalPages }: UnsubscribeTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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

  const handleReasonFilter = (reason: string) => {
    updateSearchParams({ reason: reason === 'all' ? null : reason, page: '1' })
  }

  const handleTimeFilter = (time: string) => {
    updateSearchParams({ time: time === 'all' ? null : time, page: '1' })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select
          value={searchParams.get('reason') || 'all'}
          onValueChange={handleReasonFilter}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Grund" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Gründe</SelectItem>
            <SelectItem value="too_many">Zu viele E-Mails</SelectItem>
            <SelectItem value="not_relevant">Nicht relevant</SelectItem>
            <SelectItem value="never_subscribed">Nie angemeldet</SelectItem>
            <SelectItem value="other">Sonstiges</SelectItem>
            <SelectItem value="none">Kein Feedback</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get('time') || 'all'}
          onValueChange={handleTimeFilter}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Zeitraum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Zeit</SelectItem>
            <SelectItem value="today">Heute</SelectItem>
            <SelectItem value="week">Letzte 7 Tage</SelectItem>
            <SelectItem value="month">Letzte 30 Tage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Grund</TableHead>
              <TableHead>Feedback</TableHead>
              <TableHead>Datum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <p className="text-muted-foreground">Keine Abmeldungen gefunden</p>
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => {
                const metadata = event.metadata as { reason?: string; feedbackText?: string } | null
                const reason = metadata?.reason
                const reasonInfo = reason ? REASON_LABELS[reason] : null
                const feedbackText = metadata?.feedbackText

                return (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/leads/${event.lead.id}`}
                        className="hover:underline"
                      >
                        {event.lead.firstName || '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{event.lead.email}</TableCell>
                    <TableCell>
                      {reasonInfo ? (
                        <Badge variant={reasonInfo.variant}>
                          {reasonInfo.label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {feedbackText ? (
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1 text-sm">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">
                              {feedbackText}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm">
                            {feedbackText}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeDate(event.createdAt)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} Abmeldung{total !== 1 ? 'en' : ''} insgesamt
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
    </div>
  )
}
