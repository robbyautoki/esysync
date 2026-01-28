'use client'

import { useState, useMemo } from 'react'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BarChart3, Mail, Users, ChevronDown, ChevronRight, Folder, MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'
import { SequenceActions } from './sequence-actions'

const COLORS = [
  { name: 'Grau', value: null },
  { name: 'Lila', value: '#8b5cf6' },
  { name: 'Blau', value: '#3b82f6' },
  { name: 'Grün', value: '#22c55e' },
  { name: 'Gelb', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Rot', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
]

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

interface SequenceTableProps {
  sequences: Sequence[]
  folders: SequenceFolder[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onOpenAnalytics: (sequence: Sequence) => void
  onUpdateColor: (sequenceId: string, color: string | null) => void
  onUpdateFolder: (sequenceId: string, folderId: string | null) => void
  onDeleteFolder: (folderId: string) => void
  onRenameFolder: (folderId: string, name: string) => void
}

const triggerLabels: Record<string, string> = {
  ON_IMPORT: 'Bei Import',
  MANUAL: 'Manuell',
  API_WEBHOOK: 'API/Webhook'
}

function ColorDot({ 
  color, 
  onClick, 
  disabled = false 
}: { 
  color: string | null
  onClick?: () => void
  disabled?: boolean 
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-3 h-3 rounded-full flex-shrink-0 ${
        disabled ? 'cursor-default' : 'cursor-pointer hover:scale-125 transition-transform'
      }`}
      style={{ backgroundColor: color || '#a1a1aa' }}
    />
  )
}

function ColorPicker({ 
  currentColor, 
  onSelect, 
  disabled = false 
}: { 
  currentColor: string | null
  onSelect: (color: string | null) => void 
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  if (disabled) {
    return <ColorDot color={currentColor} disabled />
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button">
          <ColorDot color={currentColor} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              className={`w-6 h-6 rounded-full hover:scale-110 transition-transform relative ${
                currentColor === c.value ? 'ring-2 ring-offset-2 ring-primary' : ''
              }`}
              style={{ backgroundColor: c.value || '#a1a1aa' }}
              onClick={() => {
                onSelect(c.value)
                setOpen(false)
              }}
              title={c.name}
            >
              {currentColor === c.value && (
                <Check className="h-3 w-3 text-white absolute inset-0 m-auto" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function FolderRow({
  folder,
  isExpanded,
  onToggle,
  sequenceCount,
  onDelete,
  onRename,
}: {
  folder: SequenceFolder
  isExpanded: boolean
  onToggle: () => void
  sequenceCount: number
  onDelete: () => void
  onRename: (name: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)

  const handleRename = () => {
    if (editName.trim() && editName !== folder.name) {
      onRename(editName.trim())
    }
    setIsEditing(false)
  }

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/50">
      <TableCell colSpan={9}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            className="p-1 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <Folder className="h-4 w-4 text-muted-foreground" />
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setIsEditing(false)
              }}
              className="h-7 w-48"
              autoFocus
            />
          ) : (
            <span className="font-medium">{folder.name}</span>
          )}
          <Badge variant="secondary" className="ml-2">
            {sequenceCount}
          </Badge>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Umbenennen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function SequenceTable({ 
  sequences, 
  folders,
  selectedIds, 
  onSelectionChange, 
  onOpenAnalytics,
  onUpdateColor,
  onUpdateFolder,
  onDeleteFolder,
  onRenameFolder,
}: SequenceTableProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Start with all folders expanded
    return new Set(folders.map(f => f.id))
  })

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

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  // Group sequences by folder
  const { folderGroups, unfoldered } = useMemo(() => {
    const groups = new Map<string, Sequence[]>()
    const noFolder: Sequence[] = []

    sequences.forEach(seq => {
      if (seq.folderId) {
        const existing = groups.get(seq.folderId) || []
        existing.push(seq)
        groups.set(seq.folderId, existing)
      } else {
        noFolder.push(seq)
      }
    })

    return { folderGroups: groups, unfoldered: noFolder }
  }, [sequences])

  const renderSequenceRow = (sequence: Sequence, indented = false) => {
    const emailSteps = (sequence.steps ?? []).filter(s => s.type === 'EMAIL').length
    // EsySync sequences automatically get purple color
    const isEsySync = sequence.name.toLowerCase().includes('esysync')
    const displayColor = isEsySync ? '#8b5cf6' : sequence.color

    return (
      <TableRow key={sequence.id} data-state={selectedIds.includes(sequence.id) ? 'selected' : undefined}>
        <TableCell className={indented ? 'pl-10' : ''}>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedIds.includes(sequence.id)}
              onCheckedChange={() => toggleOne(sequence.id)}
              aria-label={`${sequence.name} auswählen`}
            />
            <ColorPicker
              currentColor={displayColor}
              onSelect={(color) => onUpdateColor(sequence.id, color)}
              disabled={isEsySync}
            />
          </div>
        </TableCell>
        <TableCell className="font-medium">
          <Link
            href={`/sequences/${sequence.id}`}
            className="hover:underline"
          >
            {sequence.name}
          </Link>
          {isEsySync && (
            <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700 border-purple-200">
              EsySync
            </Badge>
          )}
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
          <SequenceActions 
            sequence={sequence} 
            folders={folders}
            onMoveToFolder={(folderId) => onUpdateFolder(sequence.id, folderId)}
          />
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected
                  }}
                  onCheckedChange={toggleAll}
                  aria-label="Alle auswählen"
                />
                <span className="text-xs text-muted-foreground">Farbe</span>
              </div>
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
            <>
              {/* Folders */}
              {folders.map(folder => {
                const folderSequences = folderGroups.get(folder.id) || []
                const isExpanded = expandedFolders.has(folder.id)

                return (
                  <> 
                    <FolderRow
                      key={folder.id}
                      folder={folder}
                      isExpanded={isExpanded}
                      onToggle={() => toggleFolder(folder.id)}
                      sequenceCount={folderSequences.length}
                      onDelete={() => onDeleteFolder(folder.id)}
                      onRename={(name) => onRenameFolder(folder.id, name)}
                    />
                    {isExpanded && folderSequences.map(seq => renderSequenceRow(seq, true))}
                  </>
                )
              })}

              {/* Unfoldered sequences */}
              {unfoldered.length > 0 && folders.length > 0 && (
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={9}>
                    <span className="text-sm text-muted-foreground">Ohne Ordner</span>
                  </TableCell>
                </TableRow>
              )}
              {unfoldered.map(seq => renderSequenceRow(seq, false))}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
