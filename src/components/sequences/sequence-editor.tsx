'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { StepCard } from './step-card'
import { EmailStepEditor } from './email-step-editor'
import { SequenceLeads } from './sequence-leads'

interface Step {
  id: string
  type: 'EMAIL' | 'DELAY'
  order: number
  subject?: string | null
  content?: any
  delayValue?: number | null
  delayUnit?: string | null
}

interface Sequence {
  id: string
  name: string
  trigger: string
  isActive: boolean
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
  }, [steps, name, saved])

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
      const res = await fetch(`/api/sequences/${sequence.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, steps })
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

  const addStep = async (type: 'EMAIL' | 'DELAY') => {
    const newStep: Step = {
      id: `temp-${Date.now()}`,
      type,
      order: steps.length,
      subject: type === 'EMAIL' ? 'Neuer Betreff' : null,
      content: type === 'EMAIL' ? { type: 'doc', content: [] } : null,
      delayValue: type === 'DELAY' ? 1 : null,
      delayUnit: type === 'DELAY' ? 'days' : null
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
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleToggleActive}
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

      {/* Steps */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sequenz-Steps</CardTitle>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => addStep('EMAIL')}>
                    <Mail className="mr-2 h-4 w-4" />
                    E-Mail
                  </Button>
                </TooltipTrigger>
                <TooltipContent>E-Mail-Step hinzufügen</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => addStep('DELAY')}>
                    <Clock className="mr-2 h-4 w-4" />
                    Delay
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Wartezeit hinzufügen</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Mail className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-medium mb-1">Noch keine Steps</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Füge E-Mail- oder Delay-Steps hinzu
              </p>
              <div className="flex justify-center gap-2">
                <Button size="sm" onClick={() => addStep('EMAIL')}>
                  <Mail className="mr-2 h-4 w-4" />
                  Erste E-Mail
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
                      onEdit={() => step.type === 'EMAIL' && setEditingStep(step)}
                      onUpdate={updateStep}
                      onDelete={() => deleteStep(step.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Leads in Sequence */}
      <SequenceLeads sequenceId={sequence.id} />

      {/* Info */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Tipps</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Ziehe Steps per Drag & Drop um die Reihenfolge zu ändern</li>
                <li>Nutze Variablen wie {"{{firstName}}"} und {"{{email}}"} in E-Mails</li>
                <li>Füge Delays zwischen E-Mails ein um nicht zu spammen</li>
                <li>Änderungen werden automatisch gespeichert</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
