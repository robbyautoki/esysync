'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
} from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import {
  Plus,
  Mail,
  Clock,
  Save,
  Play,
  Pause,
  ArrowLeft,
  Check,
  Loader2,
  Info,
  CalendarIcon,
  X,
  Sparkles,
  BarChart3,
  Tag,
  FolderInput
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { validateSequence, formatValidationErrors } from '@/lib/sequence-validation'
import { SequenceAnalyticsSheet } from './sequence-analytics-sheet'
import { toast } from 'sonner'
import Link from 'next/link'
import { StepCard } from './step-card'
import { EmailStepEditor } from './email-step-editor'
import { SequenceLeads } from './sequence-leads'
import { SequenceTracking } from './sequence-tracking'

interface Step {
  id: string
  type: 'EMAIL' | 'DELAY' | 'TAG' | 'SEGMENT'
  order: number
  subject?: string | null
  content?: any
  delayValue?: number | null
  delayUnit?: string | null
  tagAction?: string | null
  tagValue?: string | null
  targetSegmentId?: string | null
  segmentName?: string | null
}

interface Sequence {
  id: string
  name: string
  trigger: string
  isActive: boolean
  trackOpens: boolean
  trackClicks: boolean
  sendTime: string | null
  scheduledStartAt: string | null
  steps: Step[]
  _count: { states: number }
}

export function SequenceEditor({ sequence: initialSequence }: { sequence: Sequence }) {
  const router = useRouter()
  const [sequence, setSequence] = useState(initialSequence)
  const [steps, setSteps] = useState<Step[]>(initialSequence.steps)
  const [name, setName] = useState(initialSequence.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [editingStep, setEditingStep] = useState<Step | null>(null)
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    initialSequence.scheduledStartAt ? new Date(initialSequence.scheduledStartAt) : undefined
  )
  const [scheduledTime, setScheduledTime] = useState(
    initialSequence.scheduledStartAt
      ? format(new Date(initialSequence.scheduledStartAt), 'HH:mm')
      : '09:00'
  )
  const [confirmActiveModal, setConfirmActiveModal] = useState(false)
  const [dateModalOpen, setDateModalOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Autosave
  useEffect(() => {
    if (saved) return

    const timeout = setTimeout(() => {
      handleSave()
    }, 2000)

    return () => clearTimeout(timeout)
  }, [steps, name, saved, scheduledDate, scheduledTime])

  const markUnsaved = useCallback(() => {
    setSaved(false)
  }, [])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index
        }))
        return newItems
      })
      markUnsaved()
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Kombiniere Datum und Zeit zu ISO String
      let scheduledStartAt: string | null = null
      if (scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number)
        const combined = new Date(scheduledDate)
        combined.setHours(hours, minutes, 0, 0)
        scheduledStartAt = combined.toISOString()
      }

      const res = await fetch(`/api/sequences/${sequence.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, steps, scheduledStartAt })
      })

      if (!res.ok) throw new Error('Speichern fehlgeschlagen')

      setSaved(true)
      toast.success('Änderungen gespeichert', { duration: 2000 })
    } catch {
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    // Validierung nur beim Aktivieren
    if (!sequence.isActive) {
      const errors = validateSequence(steps)
      if (errors.length > 0) {
        toast.error(formatValidationErrors(errors), { duration: 8000 })
        setConfirmActiveModal(false)
        return
      }
    }

    try {
      const res = await fetch(`/api/sequences/${sequence.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !sequence.isActive })
      })

      if (!res.ok) throw new Error('Fehler')

      setSequence(prev => ({ ...prev, isActive: !prev.isActive }))
      toast.success(sequence.isActive ? 'Sequenz pausiert' : 'Sequenz aktiviert')
      router.refresh()
    } catch {
      toast.error('Aktion fehlgeschlagen')
    }
  }

  const handleGenerateSteps = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Bitte beschreibe deine Kampagne')
      return
    }

    setAiGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: aiPrompt, 
          sequenceId: sequence.id 
        })
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setSteps(data.steps)
      markUnsaved()
      setAiDialogOpen(false)
      setAiPrompt('')
      toast.success(`${data.steps.length} Steps generiert`)
    } catch (error) {
      toast.error('Fehler beim Generieren der Steps')
    } finally {
      setAiGenerating(false)
    }
  }

  const addStep = async (type: 'EMAIL' | 'DELAY' | 'TAG' | 'SEGMENT') => {
    const newStep: Step = {
      id: `temp-${Date.now()}`,
      type,
      order: steps.length,
      subject: type === 'EMAIL' ? 'Neuer Betreff' : null,
      content: type === 'EMAIL' ? { type: 'doc', content: [] } : null,
      delayValue: type === 'DELAY' ? 1 : null,
      delayUnit: type === 'DELAY' ? 'days' : null,
      tagAction: type === 'TAG' ? 'add' : null,
      tagValue: type === 'TAG' ? '' : null,
      targetSegmentId: type === 'SEGMENT' ? '' : null,
      segmentName: null
    }

    try {
      const res = await fetch(`/api/sequences/${sequence.id}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStep)
      })

      if (!res.ok) throw new Error('Fehler beim Hinzufügen')

      const data = await res.json()
      setSteps(prev => [...prev, data.step])
      
      if (type === 'EMAIL') {
        setEditingStep(data.step)
      }
      
      toast.success(`${type === 'EMAIL' ? 'E-Mail' : 'Delay'}-Step hinzugefügt`)
    } catch {
      toast.error('Step konnte nicht hinzugefügt werden')
    }
  }

  const updateStep = (updatedStep: Step) => {
    setSteps(prev => prev.map(s => s.id === updatedStep.id ? updatedStep : s))
    markUnsaved()
  }

  const deleteStep = async (stepId: string) => {
    try {
      const res = await fetch(`/api/sequences/${sequence.id}/steps/${stepId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Fehler beim Löschen')

      setSteps(prev => prev.filter(s => s.id !== stepId))
      toast.success('Step gelöscht')
    } catch {
      toast.error('Step konnte nicht gelöscht werden')
    }
  }

  const triggerLabels: Record<string, string> = {
    ON_IMPORT: 'Bei Import',
    MANUAL: 'Manuell',
    API_WEBHOOK: 'API/Webhook'
  }

  if (editingStep) {
    return (
      <EmailStepEditor
        step={editingStep}
        sequenceId={sequence.id}
        onSave={(updated) => {
          updateStep(updated)
          setEditingStep(null)
        }}
        onCancel={() => setEditingStep(null)}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/sequences">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zurück zur Übersicht</TooltipContent>
          </Tooltip>
          <div>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); markUnsaved() }}
              className="text-xl font-bold border-none px-0 focus-visible:ring-0 h-auto"
            />
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={sequence.isActive ? 'success' : 'secondary'}>
                {sequence.isActive ? 'Aktiv' : 'Inaktiv'}
              </Badge>
              <Badge variant="outline">{triggerLabels[sequence.trigger]}</Badge>
              <span className="text-sm text-muted-foreground">
                {sequence._count.states} Lead{sequence._count.states !== 1 ? 's' : ''}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2"
                    onClick={() => setDateModalOpen(true)}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    {scheduledDate 
                      ? `${format(scheduledDate, 'dd.MM.yyyy', { locale: de })}, ${scheduledTime}`
                      : 'Sofort'
                    }
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Startdatum festlegen</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setConfirmActiveModal(true)}
              >
                {sequence.isActive ? (
                  <><Pause className="mr-2 h-4 w-4" /> Pausieren</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Aktivieren</>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sequence.isActive 
                ? 'Neue Leads werden nicht mehr hinzugefügt' 
                : 'Sequenz für neue Leads aktivieren'}
            </TooltipContent>
          </Tooltip>

          <Button onClick={handleSave} disabled={saving || saved}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Speichert...' : saved ? 'Gespeichert' : 'Speichern'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="steps" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          <TabsTrigger value="leads">
            Leads ({sequence._count.states})
          </TabsTrigger>
        </TabsList>

        {/* Steps Tab */}
        <TabsContent value="steps" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setAiDialogOpen(true)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    KI generieren
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Steps mit KI generieren</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addStep('EMAIL')}>
                <Mail className="mr-2 h-4 w-4" />
                E-Mail
              </Button>
              <Button variant="outline" size="sm" onClick={() => addStep('DELAY')}>
                <Clock className="mr-2 h-4 w-4" />
                Delay
              </Button>
              <Button variant="outline" size="sm" onClick={() => addStep('TAG')}>
                <Tag className="mr-2 h-4 w-4" />
                Tag
              </Button>
              <Button variant="outline" size="sm" onClick={() => addStep('SEGMENT')}>
                <FolderInput className="mr-2 h-4 w-4" />
                Segment
              </Button>
            </div>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <Mail className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium text-lg mb-2">Noch keine Steps</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Füge E-Mail- oder Delay-Steps hinzu um deine Sequenz zu erstellen
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={() => addStep('EMAIL')}>
                  <Mail className="mr-2 h-4 w-4" />
                  Erste E-Mail
                </Button>
                <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Mit KI starten
                </Button>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={steps.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      index={index}
                      isLast={index === steps.length - 1}
                      prevStepType={index > 0 ? steps[index - 1].type : null}
                      nextStepType={index < steps.length - 1 ? steps[index + 1].type : null}
                      onEdit={() => step.type === 'EMAIL' && setEditingStep(step)}
                      onUpdate={updateStep}
                      onDelete={() => deleteStep(step.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <SequenceTracking 
            sequenceId={sequence.id}
            trackOpens={sequence.trackOpens}
            trackClicks={sequence.trackClicks}
            sendTime={sequence.sendTime}
            onUpdate={(trackOpens, trackClicks, sendTime) => {
              setSequence(prev => ({ ...prev, trackOpens, trackClicks, sendTime }))
            }}
            onOpenAnalytics={() => setAnalyticsOpen(true)}
          />
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="mt-6">
          <SequenceLeads sequenceId={sequence.id} />
        </TabsContent>
      </Tabs>

      {/* Bestätigungsmodal für Aktivieren/Pausieren */}
      <AlertDialog open={confirmActiveModal} onOpenChange={setConfirmActiveModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {sequence.isActive ? 'Sequenz pausieren?' : 'Sequenz aktivieren?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {sequence.isActive 
                ? 'Neue Leads werden nicht mehr automatisch hinzugefügt. Bestehende Leads in der Sequenz erhalten weiterhin ihre geplanten E-Mails.'
                : 'Die Sequenz wird für neue Leads aktiviert. Leads die den Trigger erfüllen werden automatisch hinzugefügt und erhalten die E-Mails.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                handleToggleActive()
                setConfirmActiveModal(false)
              }}
              className={sequence.isActive ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {sequence.isActive ? 'Pausieren' : 'Aktivieren'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Startdatum Modal */}
      <Dialog open={dateModalOpen} onOpenChange={setDateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Startdatum</DialogTitle>
            <DialogDescription>
              Wenn gesetzt, werden E-Mails erst ab diesem Datum versendet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'dd.MM.yyyy', { locale: de }) : 'Datum wählen'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(date) => { setScheduledDate(date); markUnsaved() }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    locale={de}
                  />
                </PopoverContent>
              </Popover>
              {scheduledDate && (
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => { setScheduledTime(e.target.value); markUnsaved() }}
                  className="w-[120px]"
                />
              )}
            </div>
            {scheduledDate && (
              <p className="text-sm text-muted-foreground">
                E-Mails werden ab {format(scheduledDate, 'dd.MM.yyyy', { locale: de })} um {scheduledTime} Uhr versendet
              </p>
            )}
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            {scheduledDate && (
              <Button 
                variant="ghost" 
                onClick={() => { setScheduledDate(undefined); markUnsaved() }}
              >
                Entfernen
              </Button>
            )}
            <Button onClick={() => setDateModalOpen(false)}>
              Fertig
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KI Steps Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Steps mit KI generieren
            </DialogTitle>
            <DialogDescription>
              Beschreibe deine Kampagne und die KI erstellt die Sequenz-Struktur für dich.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder={`Beispiel:\nMesse Onboarding Sequenz\n- 3 E-Mails über 2 Wochen\n- Tag 1: Willkommen + Recap\n- Tag 5: Produktvorstellung\n- Tag 14: Follow-up`}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="min-h-[150px]"
            />
            {steps.length > 0 && (
              <p className="text-sm text-orange-600 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Bestehende {steps.length} Steps werden überschrieben
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleGenerateSteps} disabled={aiGenerating || !aiPrompt.trim()}>
              {aiGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generiert...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generieren
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Sheet */}
      <SequenceAnalyticsSheet
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        sequence={sequence}
      />
    </div>
  )
}
