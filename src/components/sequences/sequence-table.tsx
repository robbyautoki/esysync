'use client'

import Link from 'next/link'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BarChart3, Mail, Users } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
import { SequenceActions } from './sequence-actions'

interface Sequence {
  id: string
  name: string
  isActive: boolean
  trigger: string
  createdAt: Date
  steps: { type: string }[]
  _count: { states: number }
}

interface SequenceTableProps {
  sequences: Sequence[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onOpenAnalytics: (sequence: Sequence) => void
}

const triggerLabels: Record<string, string> = {
  ON_IMPORT: 'Bei Import',
  MANUAL: 'Manuell',
  API_WEBHOOK: 'API/Webhook'
}

export function SequenceTable({ sequences, selectedIds, onSelectionChange, onOpenAnalytics }: SequenceTableProps) {
  const allSelected = sequences.length > 0 && selectedIds.length === sequences.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < sequences.length

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange(sequences.map(s => s.id))
    }
  }

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected
                }}
                onCheckedChange={toggleAll}
                aria-label="Alle auswählen"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  E-Mails
                </TooltipTrigger>
                <TooltipContent>Anzahl E-Mail-Steps</TooltipContent>
              </Tooltip>
            </TableHead>
            <TableHead>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Leads
                </TooltipTrigger>
                <TooltipContent>Leads in dieser Sequenz</TooltipContent>
              </Tooltip>
            </TableHead>
            <TableHead>Erstellt</TableHead>
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sequences.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                <p className="text-muted-foreground">Keine Sequenzen vorhanden</p>
              </TableCell>
            </TableRow>
          ) : (
            sequences.map((sequence) => {
              const emailSteps = sequence.steps.filter(s => s.type === 'EMAIL').length

              return (
                <TableRow key={sequence.id} data-state={selectedIds.includes(sequence.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(sequence.id)}
                      onCheckedChange={() => toggleOne(sequence.id)}
                      aria-label={`${sequence.name} auswählen`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/sequences/${sequence.id}`}
                      className="hover:underline"
                    >
                      {sequence.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sequence.isActive ? 'success' : 'secondary'}>
                      {sequence.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {triggerLabels[sequence.trigger] || sequence.trigger}
                    </Badge>
                  </TableCell>
                  <TableCell>{emailSteps}</TableCell>
                  <TableCell>{sequence._count.states}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeDate(sequence.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onOpenAnalytics(sequence)}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Analytics anzeigen</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <SequenceActions sequence={sequence} />
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
