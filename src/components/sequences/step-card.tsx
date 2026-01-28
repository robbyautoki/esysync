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
import { Mail, Clock, GripVertical, Edit, Trash2, AlertTriangle, Tag, FolderInput, GitBranch, Plus, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FalseStep {
  id: string
  type: 'EMAIL' | 'DELAY' | 'TAG'
  subject?: string | null
  delayValue?: number | null
  delayUnit?: string | null
  tagAction?: string | null
  tagValue?: string | null
}

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
  if (step.type === 'CONDITION' && !step.conditionType) {
    warnings.push('Bedingung nicht konfiguriert')
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

      {/* Branches Grid für CONDITION */}
      {step.type === 'CONDITION' && (
        <div className="grid grid-cols-2 gap-4 mt-3 ml-14">
          {/* TRUE Branch Box */}
          <div className="border rounded-lg p-3 bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3 text-green-600 font-medium text-sm">
              <Check className="h-4 w-4" />
              Falls JA
            </div>
            <div className="space-y-2">
              {(step.trueSteps || []).map((ts) => (
                <div key={ts.id} className="flex items-center gap-2 p-2 bg-white dark:bg-green-950/30 rounded-md border border-green-100 dark:border-green-900">
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0",
                    ts.type === 'EMAIL' && "bg-blue-100 text-blue-600",
                    ts.type === 'DELAY' && "bg-orange-100 text-orange-600",
                    ts.type === 'TAG' && "bg-purple-100 text-purple-600"
                  )}>
                    {ts.type === 'EMAIL' && <Mail className="h-3 w-3" />}
                    {ts.type === 'DELAY' && <Clock className="h-3 w-3" />}
                    {ts.type === 'TAG' && <Tag className="h-3 w-3" />}
                  </div>

                  {ts.type === 'EMAIL' && (
                    <Input
                      type="text"
                      placeholder="Betreff"
                      value={ts.subject || ''}
                      onChange={(e) => updateTrueStep(ts.id, { subject: e.target.value })}
                      className="flex-1 h-7 text-sm min-w-0"
                    />
                  )}

                  {ts.type === 'DELAY' && (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <Input
                        type="number"
                        min={1}
                        value={ts.delayValue || 1}
                        onChange={(e) => updateTrueStep(ts.id, { delayValue: parseInt(e.target.value) || 1 })}
                        className="w-12 h-7 text-sm"
                      />
                      <Select 
                        value={ts.delayUnit || 'days'} 
                        onValueChange={(value) => updateTrueStep(ts.id, { delayUnit: value })}
                      >
                        <SelectTrigger className="w-20 h-7 text-sm">
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

                  {ts.type === 'TAG' && (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <Select 
                        value={ts.tagAction || 'add'} 
                        onValueChange={(value) => updateTrueStep(ts.id, { tagAction: value })}
                      >
                        <SelectTrigger className="w-16 h-7 text-sm">
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
                        value={ts.tagValue || ''}
                        onChange={(e) => updateTrueStep(ts.id, { tagValue: e.target.value })}
                        className="flex-1 h-7 text-sm min-w-0"
                      />
                    </div>
                  )}

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteTrueStep(ts.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-1 pt-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => addTrueStep('EMAIL')}>
                  <Plus className="h-3 w-3 mr-1" />
                  E-Mail
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => addTrueStep('DELAY')}>
                  <Plus className="h-3 w-3 mr-1" />
                  Delay
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => addTrueStep('TAG')}>
                  <Plus className="h-3 w-3 mr-1" />
                  Tag
                </Button>
              </div>
            </div>
          </div>

          {/* FALSE Branch Box */}
          <div className="border rounded-lg p-3 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-3 text-red-600 font-medium text-sm">
              <X className="h-4 w-4" />
              Falls NEIN
            </div>
            <div className="space-y-2">
              {(step.falseSteps || []).map((fs) => (
                <div key={fs.id} className="flex items-center gap-2 p-2 bg-white dark:bg-red-950/30 rounded-md border border-red-100 dark:border-red-900">
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0",
                    fs.type === 'EMAIL' && "bg-blue-100 text-blue-600",
                    fs.type === 'DELAY' && "bg-orange-100 text-orange-600",
                    fs.type === 'TAG' && "bg-purple-100 text-purple-600"
                  )}>
                    {fs.type === 'EMAIL' && <Mail className="h-3 w-3" />}
                    {fs.type === 'DELAY' && <Clock className="h-3 w-3" />}
                    {fs.type === 'TAG' && <Tag className="h-3 w-3" />}
                  </div>

                  {fs.type === 'EMAIL' && (
                    <Input
                      type="text"
                      placeholder="Betreff"
                      value={fs.subject || ''}
                      onChange={(e) => updateFalseStep(fs.id, { subject: e.target.value })}
                      className="flex-1 h-7 text-sm min-w-0"
                    />
                  )}

                  {fs.type === 'DELAY' && (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <Input
                        type="number"
                        min={1}
                        value={fs.delayValue || 1}
                        onChange={(e) => updateFalseStep(fs.id, { delayValue: parseInt(e.target.value) || 1 })}
                        className="w-12 h-7 text-sm"
                      />
                      <Select 
                        value={fs.delayUnit || 'days'} 
                        onValueChange={(value) => updateFalseStep(fs.id, { delayUnit: value })}
                      >
                        <SelectTrigger className="w-20 h-7 text-sm">
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

                  {fs.type === 'TAG' && (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <Select 
                        value={fs.tagAction || 'add'} 
                        onValueChange={(value) => updateFalseStep(fs.id, { tagAction: value })}
                      >
                        <SelectTrigger className="w-16 h-7 text-sm">
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
                        value={fs.tagValue || ''}
                        onChange={(e) => updateFalseStep(fs.id, { tagValue: e.target.value })}
                        className="flex-1 h-7 text-sm min-w-0"
                      />
                    </div>
                  )}

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteFalseStep(fs.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-1 pt-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => addFalseStep('EMAIL')}>
                  <Plus className="h-3 w-3 mr-1" />
                  E-Mail
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => addFalseStep('DELAY')}>
                  <Plus className="h-3 w-3 mr-1" />
                  Delay
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => addFalseStep('TAG')}>
                  <Plus className="h-3 w-3 mr-1" />
                  Tag
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
