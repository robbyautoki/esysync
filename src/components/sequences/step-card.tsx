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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Mail, Clock, GripVertical, Edit, Trash2, AlertTriangle, Tag, FolderInput, GitBranch, Plus, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmailStepEditor } from './email-step-editor'

export interface BranchStep {
  id: string
  type: 'EMAIL' | 'DELAY' | 'TAG'
  subject?: string | null
  content?: any
  delayValue?: number | null
  delayUnit?: string | null
  tagAction?: string | null
  tagValue?: string | null
}

// Alias für Rückwärtskompatibilität
type FalseStep = BranchStep

interface Step {
  id: string
  type: 'EMAIL' | 'DELAY' | 'TAG' | 'SEGMENT' | 'CONDITION'
  order: number
  subject?: string | null
  content?: any
  delayValue?: number | null
  delayUnit?: string | null
  tagAction?: string | null
  tagValue?: string | null
  targetSegmentId?: string | null
  segmentName?: string | null
  conditionType?: string | null
  conditionValue?: string | null
  trueSteps?: FalseStep[] | null
  falseSteps?: FalseStep[] | null
}

interface StepCardProps {
  step: Step
  index: number
  isLast?: boolean
  prevStepType?: 'EMAIL' | 'DELAY' | 'TAG' | 'SEGMENT' | 'CONDITION' | null
  nextStepType?: 'EMAIL' | 'DELAY' | 'TAG' | 'SEGMENT' | 'CONDITION' | null
  onEdit: () => void
  onUpdate: (step: Step) => void
  onDelete: () => void
  emailSteps?: Array<{ id: string; subject: string | null; index: number }>
  segments?: Array<{ id: string; name: string }>
}

export function StepCard({ step, index, isLast, prevStepType, nextStepType, onEdit, onUpdate, onDelete, emailSteps = [], segments = [] }: StepCardProps) {
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
    if (prevStepType === 'EMAIL' || nextStepType === 'EMAIL') {
      warnings.push('Delay zwischen E-Mails fehlt')
    }
  }
  if (step.type === 'DELAY' && isLast) {
    warnings.push('Delay am Ende ist überflüssig')
  }
  if (step.type === 'TAG' && !step.tagValue) {
    warnings.push('Tag nicht gesetzt')
  }
  if (step.type === 'SEGMENT' && !step.targetSegmentId) {
    warnings.push('Segment nicht gewählt')
  }
  if (step.type === 'CONDITION') {
    if (!step.conditionType) {
      warnings.push('Bedingung nicht konfiguriert')
    }
    if (step.conditionType && !step.conditionValue?.trim()) {
      warnings.push('Bedingungswert fehlt')
    }
    
    const trueSteps = step.trueSteps || []
    const falseSteps = step.falseSteps || []
    
    if (trueSteps.length === 0 && falseSteps.length === 0) {
      warnings.push('Keine Aktionen definiert')
    }
    
    // Branch-Steps prüfen
    ;[...trueSteps, ...falseSteps].forEach(bs => {
      if (bs.type === 'EMAIL' && !bs.subject?.trim()) {
        warnings.push('Branch: E-Mail ohne Betreff')
      }
      if (bs.type === 'TAG' && !bs.tagValue?.trim()) {
        warnings.push('Branch: Tag nicht gesetzt')
      }
    })
  }
  const hasWarning = warnings.length > 0

  const conditionTypes = [
    { value: 'HAS_TAG', label: 'Hat Tag' },
    { value: 'NOT_HAS_TAG', label: 'Hat Tag nicht' },
    { value: 'IN_SEGMENT', label: 'Ist in Segment' },
    { value: 'NOT_IN_SEGMENT', label: 'Ist nicht in Segment' },
    { value: 'OPENED_EMAIL', label: 'Hat E-Mail geöffnet' },
    { value: 'NOT_OPENED_EMAIL', label: 'Hat E-Mail nicht geöffnet' },
    { value: 'CLICKED_EMAIL', label: 'Hat Link geklickt' },
  ]

  const getConditionLabel = () => {
    if (!step.conditionType) return 'Bedingung wählen...'
    const type = conditionTypes.find(t => t.value === step.conditionType)
    const typeName = type?.label || step.conditionType
    
    if (step.conditionType?.includes('TAG') && step.conditionValue) {
      return `${typeName}: "${step.conditionValue}"`
    }
    if (step.conditionType?.includes('SEGMENT') && step.conditionValue) {
      const seg = segments.find(s => s.id === step.conditionValue)
      return `${typeName}: ${seg?.name || 'Unbekannt'}`
    }
    if (step.conditionType?.includes('EMAIL') && step.conditionValue) {
      const emailStep = emailSteps.find(e => e.id === step.conditionValue)
      return `${typeName}: E-Mail ${emailStep ? emailStep.index + 1 : '?'}`
    }
    return typeName
  }

  const addFalseStep = (type: 'EMAIL' | 'DELAY' | 'TAG') => {
    const newFalseStep: FalseStep = {
      id: `false-${Date.now()}`,
      type,
      subject: type === 'EMAIL' ? 'Reminder' : null,
      delayValue: type === 'DELAY' ? 1 : null,
      delayUnit: type === 'DELAY' ? 'days' : null,
      tagAction: type === 'TAG' ? 'add' : null,
      tagValue: type === 'TAG' ? '' : null,
    }
    const currentFalseSteps = step.falseSteps || []
    onUpdate({ ...step, falseSteps: [...currentFalseSteps, newFalseStep] })
  }

  const updateFalseStep = (falseStepId: string, updates: Partial<FalseStep>) => {
    const currentFalseSteps = step.falseSteps || []
    const updated = currentFalseSteps.map(fs => 
      fs.id === falseStepId ? { ...fs, ...updates } : fs
    )
    onUpdate({ ...step, falseSteps: updated })
  }

  const deleteFalseStep = (falseStepId: string) => {
    const currentFalseSteps = step.falseSteps || []
    onUpdate({ ...step, falseSteps: currentFalseSteps.filter(fs => fs.id !== falseStepId) })
  }

  const addTrueStep = (type: 'EMAIL' | 'DELAY' | 'TAG') => {
    const newTrueStep: FalseStep = {
      id: `true-${Date.now()}`,
      type,
      subject: type === 'EMAIL' ? '' : null,
      delayValue: type === 'DELAY' ? 1 : null,
      delayUnit: type === 'DELAY' ? 'days' : null,
      tagAction: type === 'TAG' ? 'add' : null,
      tagValue: type === 'TAG' ? '' : null,
    }
    const currentTrueSteps = step.trueSteps || []
    onUpdate({ ...step, trueSteps: [...currentTrueSteps, newTrueStep] })
  }

  const updateTrueStep = (trueStepId: string, updates: Partial<FalseStep>) => {
    const currentTrueSteps = step.trueSteps || []
    const updated = currentTrueSteps.map(ts => 
      ts.id === trueStepId ? { ...ts, ...updates } : ts
    )
    onUpdate({ ...step, trueSteps: updated })
  }

  const deleteTrueStep = (trueStepId: string) => {
    const currentTrueSteps = step.trueSteps || []
    onUpdate({ ...step, trueSteps: currentTrueSteps.filter(ts => ts.id !== trueStepId) })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 border rounded-lg bg-card",
        step.type === 'CONDITION' ? "space-y-3" : "flex items-center gap-3",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Main Row */}
      <div className="flex items-center gap-3">
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
        step.type === 'EMAIL' && "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
        step.type === 'DELAY' && "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
        step.type === 'TAG' && "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
        step.type === 'SEGMENT' && "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
        step.type === 'CONDITION' && "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"
      )}>
        {step.type === 'EMAIL' && <Mail className="h-5 w-5" />}
        {step.type === 'DELAY' && <Clock className="h-5 w-5" />}
        {step.type === 'TAG' && <Tag className="h-5 w-5" />}
        {step.type === 'SEGMENT' && <FolderInput className="h-5 w-5" />}
        {step.type === 'CONDITION' && <GitBranch className="h-5 w-5" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {step.type === 'EMAIL' && (
          <div>
            <p className="font-medium truncate">{step.subject || 'Kein Betreff'}</p>
            <p className="text-sm text-muted-foreground">E-Mail</p>
          </div>
        )}
        
        {step.type === 'DELAY' && (
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

        {step.type === 'TAG' && (
          <div className="flex items-center gap-2">
            <Select 
              value={step.tagAction || 'add'} 
              onValueChange={(value) => onUpdate({ ...step, tagAction: value })}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Hinzufügen</SelectItem>
                <SelectItem value="remove">Entfernen</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Tag-Name"
              value={step.tagValue || ''}
              onChange={(e) => onUpdate({ ...step, tagValue: e.target.value })}
              className="w-40 h-8"
            />
          </div>
        )}

        {step.type === 'SEGMENT' && (
          <div>
            <p className="font-medium truncate">
              → {step.segmentName || 'Segment wählen...'}
            </p>
            <p className="text-sm text-muted-foreground">In Segment verschieben</p>
          </div>
        )}

        {step.type === 'CONDITION' && (
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">WENN</span>
              <Select 
                value={step.conditionType || ''} 
                onValueChange={(value) => onUpdate({ ...step, conditionType: value, conditionValue: '' })}
              >
                <SelectTrigger className="w-48 h-8">
                  <SelectValue placeholder="Bedingung wählen" />
                </SelectTrigger>
                <SelectContent>
                  {conditionTypes.map(ct => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value Input basierend auf Condition Type */}
              {step.conditionType?.includes('TAG') && (
                <Input
                  type="text"
                  placeholder="Tag-Name"
                  value={step.conditionValue || ''}
                  onChange={(e) => onUpdate({ ...step, conditionValue: e.target.value })}
                  className="w-40 h-8"
                />
              )}

              {step.conditionType?.includes('SEGMENT') && (
                <Select 
                  value={step.conditionValue || ''} 
                  onValueChange={(value) => onUpdate({ ...step, conditionValue: value })}
                >
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue placeholder="Segment wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map(seg => (
                      <SelectItem key={seg.id} value={seg.id}>
                        {seg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {step.conditionType?.includes('EMAIL') && (
                <Select 
                  value={step.conditionValue || ''} 
                  onValueChange={(value) => onUpdate({ ...step, conditionValue: value })}
                >
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue placeholder="E-Mail wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailSteps.map(es => (
                      <SelectItem key={es.id} value={es.id}>
                        E-Mail {es.index + 1}: {es.subject || 'Kein Betreff'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
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
              <p className="font-medium mb-1">
                {step.type === 'EMAIL' ? 'E-Mail unvollständig:' : 'Hinweis:'}
              </p>
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

          </div>
  )
}

// Separate Komponente für Condition Branches
const delayUnitsForBranches = [
  { value: 'minutes', label: 'Min' },
  { value: 'hours', label: 'Std' },
  { value: 'days', label: 'Tage' },
]

interface ConditionBranchesProps {
  step: {
    id: string
    trueSteps?: BranchStep[] | null
    falseSteps?: BranchStep[] | null
  }
  onUpdate: (updates: { trueSteps?: BranchStep[] | null; falseSteps?: BranchStep[] | null }) => void
}

export function ConditionBranches({ step, onUpdate }: ConditionBranchesProps) {
  const [editingBranchEmail, setEditingBranchEmail] = useState<{
    stepId: string
    isTrue: boolean
    branchStep: BranchStep
  } | null>(null)

  const addTrueStep = (type: 'EMAIL' | 'DELAY' | 'TAG') => {
    const newStep: BranchStep = {
      id: `true-${Date.now()}`,
      type,
      subject: type === 'EMAIL' ? '' : null,
      content: type === 'EMAIL' ? null : null,
      delayValue: type === 'DELAY' ? 1 : null,
      delayUnit: type === 'DELAY' ? 'days' : null,
      tagAction: type === 'TAG' ? 'add' : null,
      tagValue: type === 'TAG' ? '' : null,
    }
    onUpdate({ trueSteps: [...(step.trueSteps || []), newStep] })
  }

  const updateTrueStep = (stepId: string, updates: Partial<BranchStep>) => {
    const updated = (step.trueSteps || []).map(s => s.id === stepId ? { ...s, ...updates } : s)
    onUpdate({ trueSteps: updated })
  }

  const deleteTrueStep = (stepId: string) => {
    onUpdate({ trueSteps: (step.trueSteps || []).filter(s => s.id !== stepId) })
  }

  const addFalseStep = (type: 'EMAIL' | 'DELAY' | 'TAG') => {
    const newStep: BranchStep = {
      id: `false-${Date.now()}`,
      type,
      subject: type === 'EMAIL' ? '' : null,
      content: type === 'EMAIL' ? null : null,
      delayValue: type === 'DELAY' ? 1 : null,
      delayUnit: type === 'DELAY' ? 'days' : null,
      tagAction: type === 'TAG' ? 'add' : null,
      tagValue: type === 'TAG' ? '' : null,
    }
    onUpdate({ falseSteps: [...(step.falseSteps || []), newStep] })
  }

  const updateFalseStep = (stepId: string, updates: Partial<BranchStep>) => {
    const updated = (step.falseSteps || []).map(s => s.id === stepId ? { ...s, ...updates } : s)
    onUpdate({ falseSteps: updated })
  }

  const deleteFalseStep = (stepId: string) => {
    onUpdate({ falseSteps: (step.falseSteps || []).filter(s => s.id !== stepId) })
  }

  const renderBranchStep = (bs: BranchStep, isTrue: boolean) => (
    <div key={bs.id} className="flex items-center gap-2 p-2 bg-card rounded-md border">
      <div className={cn(
        "w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0",
        bs.type === 'EMAIL' && "bg-blue-100 text-blue-600",
        bs.type === 'DELAY' && "bg-orange-100 text-orange-600",
        bs.type === 'TAG' && "bg-purple-100 text-purple-600"
      )}>
        {bs.type === 'EMAIL' && <Mail className="h-3 w-3" />}
        {bs.type === 'DELAY' && <Clock className="h-3 w-3" />}
        {bs.type === 'TAG' && <Tag className="h-3 w-3" />}
      </div>

      {bs.type === 'EMAIL' && (
        <>
          <span className="flex-1 text-sm truncate text-muted-foreground">
            {bs.subject || 'Kein Betreff'}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 flex-shrink-0"
                onClick={() => setEditingBranchEmail({ stepId: bs.id, isTrue, branchStep: bs })}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>E-Mail bearbeiten</TooltipContent>
          </Tooltip>
        </>
      )}

      {bs.type === 'DELAY' && (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input
            type="number"
            min={1}
            value={bs.delayValue || 1}
            onChange={(e) => isTrue ? updateTrueStep(bs.id, { delayValue: parseInt(e.target.value) || 1 }) : updateFalseStep(bs.id, { delayValue: parseInt(e.target.value) || 1 })}
            className="w-12 h-7 text-sm"
          />
          <Select 
            value={bs.delayUnit || 'days'} 
            onValueChange={(value) => isTrue ? updateTrueStep(bs.id, { delayUnit: value }) : updateFalseStep(bs.id, { delayUnit: value })}
          >
            <SelectTrigger className="w-20 h-7 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {delayUnitsForBranches.map(unit => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {bs.type === 'TAG' && (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Select 
            value={bs.tagAction || 'add'} 
            onValueChange={(value) => isTrue ? updateTrueStep(bs.id, { tagAction: value }) : updateFalseStep(bs.id, { tagAction: value })}
          >
            <SelectTrigger className="w-14 h-7 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="add">+</SelectItem>
              <SelectItem value="remove">-</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="Tag"
            value={bs.tagValue || ''}
            onChange={(e) => isTrue ? updateTrueStep(bs.id, { tagValue: e.target.value }) : updateFalseStep(bs.id, { tagValue: e.target.value })}
            className="flex-1 h-7 text-sm min-w-0"
          />
        </div>
      )}

      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => isTrue ? deleteTrueStep(bs.id) : deleteFalseStep(bs.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )

  return (
    <div className="relative">
      {/* Verbindungslinie */}
      <div className="absolute left-1/2 -top-3 w-px h-3 bg-border" />
      <div className="absolute left-1/4 top-0 right-1/4 h-px bg-border" />
      <div className="absolute left-1/4 top-0 w-px h-3 bg-border" />
      <div className="absolute right-1/4 top-0 w-px h-3 bg-border" />
      
      <div className="grid grid-cols-2 gap-4 pt-3">
        {/* TRUE Branch */}
        <div className="border rounded-lg p-3 bg-card">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-3">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Wird ausgeführt wenn Bedingung erfüllt</TooltipContent>
          </Tooltip>
          
          <div className="space-y-2">
            {(step.trueSteps || []).map(bs => renderBranchStep(bs, true))}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-start">
                  <Plus className="h-3 w-3 mr-1" />
                  Step hinzufügen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => addTrueStep('EMAIL')}>
                  <Mail className="h-4 w-4 mr-2" />
                  E-Mail
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addTrueStep('DELAY')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Delay
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addTrueStep('TAG')}>
                  <Tag className="h-4 w-4 mr-2" />
                  Tag
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* FALSE Branch */}
        <div className="border rounded-lg p-3 bg-card">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-3">
                <X className="h-4 w-4 text-red-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Wird ausgeführt wenn Bedingung nicht erfüllt</TooltipContent>
          </Tooltip>
          
          <div className="space-y-2">
            {(step.falseSteps || []).map(bs => renderBranchStep(bs, false))}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-start">
                  <Plus className="h-3 w-3 mr-1" />
                  Step hinzufügen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => addFalseStep('EMAIL')}>
                  <Mail className="h-4 w-4 mr-2" />
                  E-Mail
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addFalseStep('DELAY')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Delay
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addFalseStep('TAG')}>
                  <Tag className="h-4 w-4 mr-2" />
                  Tag
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* E-Mail Editor Sheet für Branch Steps */}
      <Sheet open={!!editingBranchEmail} onOpenChange={(open) => !open && setEditingBranchEmail(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Branch E-Mail bearbeiten</SheetTitle>
          </SheetHeader>
          {editingBranchEmail && (
            <div className="mt-4">
              <EmailStepEditor
                step={{
                  id: editingBranchEmail.stepId,
                  type: 'EMAIL',
                  order: 0,
                  subject: editingBranchEmail.branchStep.subject || '',
                  content: editingBranchEmail.branchStep.content || null
                }}
                localMode={true}
                onSave={(updatedStep) => {
                  if (editingBranchEmail.isTrue) {
                    updateTrueStep(editingBranchEmail.stepId, { 
                      subject: updatedStep.subject, 
                      content: updatedStep.content 
                    })
                  } else {
                    updateFalseStep(editingBranchEmail.stepId, { 
                      subject: updatedStep.subject, 
                      content: updatedStep.content 
                    })
                  }
                  setEditingBranchEmail(null)
                }}
                onCancel={() => setEditingBranchEmail(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
