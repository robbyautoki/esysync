'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Folder, MoreHorizontal, Pencil, Trash2, Plus, Layers } from 'lucide-react'

interface SequenceFolder {
  id: string
  name: string
  color: string | null
  order: number
}

interface FolderSidebarProps {
  folders: SequenceFolder[]
  selectedFolderId: string | null // null = "Alle"
  onSelectFolder: (folderId: string | null) => void
  sequenceCounts: Record<string, number> // folderId -> count
  totalCount: number
  onCreateFolder: () => void
  onRenameFolder: (folderId: string, name: string) => void
  onDeleteFolder: (folderId: string) => void
}

function FolderItem({
  folder,
  isSelected,
  count,
  onSelect,
  onRename,
  onDelete,
}: {
  folder: SequenceFolder
  isSelected: boolean
  count: number
  onSelect: () => void
  onRename: (name: string) => void
  onDelete: () => void
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
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
        isSelected 
          ? 'bg-primary/10 text-primary font-medium' 
          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      )}
      onClick={() => !isEditing && onSelect()}
    >
      <Folder className="h-4 w-4 flex-shrink-0" />
      
      {isEditing ? (
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-6 text-sm flex-1"
          autoFocus
        />
      ) : (
        <>
          <span className="text-sm flex-1 truncate">{folder.name}</span>
          <span className="text-xs tabular-nums opacity-60">{count}</span>
        </>
      )}

      {!isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Umbenennen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  sequenceCounts,
  totalCount,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  return (
    <div className="w-64 flex-shrink-0 border rounded-lg p-4 space-y-1 min-h-[300px] bg-muted/30">
      {/* Alle */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
          selectedFolderId === null 
            ? 'bg-primary/10 text-primary font-medium' 
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Layers className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm flex-1">Alle Sequenzen</span>
        <span className="text-xs tabular-nums opacity-60">{totalCount}</span>
      </div>

      {/* Ordner Section */}
      <div className="pt-4">
        <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Ordner
        </p>
      </div>

      {/* Folders */}
      {folders.map(folder => (
        <FolderItem
          key={folder.id}
          folder={folder}
          isSelected={selectedFolderId === folder.id}
          count={sequenceCounts[folder.id] || 0}
          onSelect={() => onSelectFolder(folder.id)}
          onRename={(name) => onRenameFolder(folder.id, name)}
          onDelete={() => onDeleteFolder(folder.id)}
        />
      ))}

      {/* Empty state */}
      {folders.length === 0 && (
        <p className="px-3 text-sm text-muted-foreground">
          Noch keine Ordner
        </p>
      )}

      {/* Add Folder */}
      <div className="pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={onCreateFolder}
        >
          <Plus className="h-4 w-4 mr-2" />
          Neuer Ordner
        </Button>
      </div>
    </div>
  )
}
