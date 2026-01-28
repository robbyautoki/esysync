'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Check,
  BarChart3
} from 'lucide-react'
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

interface FolderAccordionProps {
  folders: SequenceFolder[]
  sequences: Sequence[]
  onUpdateColor: (sequenceId: string, color: string | null) => void
  onUpdateFolder: (sequenceId: string, folderId: string | null) => void
  onDeleteFolder: (folderId: string) => void
  onRenameFolder: (folderId: string, name: string) => void
  onOpenAnalytics: (sequence: Sequence) => void
}

function ColorDot({ color, onClick, disabled = false }: { 
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

function FolderItem({
  folder,
  sequences,
  onDeleteFolder,
  onRenameFolder,
  onUpdateColor,
  onUpdateFolder,
  onOpenAnalytics,
}: {
  folder: SequenceFolder
  sequences: Sequence[]
  onDeleteFolder: () => void
  onRenameFolder: (name: string) => void
  onUpdateColor: (sequenceId: string, color: string | null) => void
  onUpdateFolder: (sequenceId: string, folderId: string | null) => void
  onOpenAnalytics: (sequence: Sequence) => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)

  const handleRename = () => {
    if (editName.trim() && editName !== folder.name) {
      onRenameFolder(editName.trim())
    }
    setIsEditing(false)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group">
        <CollapsibleTrigger asChild>
          <button type="button" className="hover:bg-muted rounded p-0.5">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        
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
            className="h-6 w-40 text-sm"
            autoFocus
          />
        ) : (
          <span className="font-medium flex-1 text-sm">{folder.name}</span>
        )}
        
        <span className="text-xs text-muted-foreground tabular-nums">
          {sequences.length}
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
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
              onClick={onDeleteFolder}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CollapsibleContent>
        <div className="ml-5 border-l border-muted pl-3 space-y-0.5 py-1">
          {sequences.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1 pl-2">
              Leer
            </p>
          ) : (
            sequences.map(sequence => {
              const isEsySync = sequence.name.toLowerCase().includes('esysync')
              const displayColor = isEsySync ? '#8b5cf6' : sequence.color

              return (
                <div 
                  key={sequence.id}
                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 group"
                >
                  <ColorPicker
                    currentColor={displayColor}
                    onSelect={(color) => onUpdateColor(sequence.id, color)}
                    disabled={isEsySync}
                  />
                  
                  <Link
                    href={`/sequences/${sequence.id}`}
                    className="text-sm hover:underline flex-1 min-w-0 truncate"
                  >
                    {sequence.name}
                  </Link>

                  {isEsySync && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200">
                      EsySync
                    </Badge>
                  )}
                  
                  <Badge variant={sequence.isActive ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0">
                    {sequence.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                  
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {sequence._count.states}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => onOpenAnalytics(sequence)}
                  >
                    <BarChart3 className="h-3 w-3" />
                  </Button>
                  
                  <SequenceActions 
                    sequence={sequence}
                    folders={[]}
                    onMoveToFolder={(folderId) => onUpdateFolder(sequence.id, folderId)}
                  />
                </div>
              )
            })
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function FolderAccordion({
  folders,
  sequences,
  onUpdateColor,
  onUpdateFolder,
  onDeleteFolder,
  onRenameFolder,
  onOpenAnalytics,
}: FolderAccordionProps) {
  // Group sequences by folder
  const getSequencesForFolder = (folderId: string) => {
    return sequences.filter(s => s.folderId === folderId)
  }

  return (
    <div className="space-y-1">
      {folders.map(folder => (
        <FolderItem
          key={folder.id}
          folder={folder}
          sequences={getSequencesForFolder(folder.id)}
          onDeleteFolder={() => onDeleteFolder(folder.id)}
          onRenameFolder={(name) => onRenameFolder(folder.id, name)}
          onUpdateColor={onUpdateColor}
          onUpdateFolder={onUpdateFolder}
          onOpenAnalytics={onOpenAnalytics}
        />
      ))}
    </div>
  )
}
