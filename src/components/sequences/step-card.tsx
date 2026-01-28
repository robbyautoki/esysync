'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Mail, Clock, GripVertical, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  type: 'EMAIL' | 'DELAY'
  order: number
  subject?: string | null
  content?: any
  delayValue?: number | null
  delayUnit?: string | null
}

interface StepCardProps {
  step: Step
  index: number
  onEdit: () => void
  onUpdate: (step: Step) => void
  onDelete: () => void
}

export function StepCard({ step, index, onEdit, onUpdate, onDelete }: StepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const delayUnits = [
    { value: 'minutes', label: 'Minuten' },
    { value: 'hours', label: 'Stunden' },
    { value: 'days', label: 'Tage' },
  ]

  // Warnungen für E-Mail Steps
  const hasContent = step.type === 'EMAIL' && 
    step.content?.content && 
    Array.isArray(step.content.content) && 
    step.content.content.length > 0

  const contentString = step.content ? JSON.stringify(step.content) : ''
  const hasFirstName = contentString.includes('{{firstName}}') || contentString.includes('{{ firstName }}')

  const warnings: string[] = []
  if (step.type === 'EMAIL') {
    if (!hasContent) warnings.push('Kein Inhalt vorhanden')
    if (!hasFirstName) warnings.push('{{firstName}} fehlt')
  }
  const hasWarning = warnings.length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-4 border rounded-lg bg-card",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Drag Handle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Ziehen um zu verschieben</TooltipContent>
      </Tooltip>

      {/* Step Number */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
        {index + 1}
      </div>

      {/* Step Icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
        step.type === 'EMAIL' ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" : "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
      )}>
        {step.type === 'EMAIL' ? (
          <Mail className="h-5 w-5" />
        ) : (
          <Clock className="h-5 w-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {step.type === 'EMAIL' ? (
          <div>
            <p className="font-medium truncate">{step.subject || 'Kein Betreff'}</p>
            <p className="text-sm text-muted-foreground">E-Mail</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Warte</span>
            <Input
              type="number"
              min={1}
              value={step.delayValue || 1}
              onChange={(e) => onUpdate({ ...step, delayValue: parseInt(e.target.value) || 1 })}
              className="w-20 h-8"
            />
            <Select 
              value={step.delayUnit || 'days'} 
              onValueChange={(value) => onUpdate({ ...step, delayUnit: value })}
            >
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {delayUnits.map(unit => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Warning + Actions */}
      <div className="flex items-center gap-1">
        {hasWarning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2 cursor-help">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium mb-1">E-Mail unvollständig:</p>
              {warnings.map((w, i) => (
                <p key={i}>• {w}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}

        {step.type === 'EMAIL' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>E-Mail bearbeiten</TooltipContent>
          </Tooltip>
        )}
        
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Step löschen</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Step löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Dieser Step wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onDelete}
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
