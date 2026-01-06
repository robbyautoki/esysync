'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Send, 
  Undo, 
  Redo,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Image,
  Variable,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { TiptapEditor } from './tiptap-editor'

interface Step {
  id: string
  type: 'EMAIL' | 'DELAY'
  order: number
  subject?: string | null
  content?: any
  delayValue?: number | null
  delayUnit?: string | null
}

interface EmailStepEditorProps {
  step: Step
  sequenceId: string
  onSave: (step: Step) => void
  onCancel: () => void
}

const variables = [
  { key: 'firstName', label: 'Vorname', example: 'Max' },
  { key: 'email', label: 'E-Mail', example: 'max@beispiel.de' },
  { key: 'unsubscribe_link', label: 'Abmelde-Link', example: '[Link]' },
]

export function EmailStepEditor({ step, sequenceId, onSave, onCancel }: EmailStepEditorProps) {
  const [subject, setSubject] = useState(step.subject || '')
  const [content, setContent] = useState(step.content)
  const [saving, setSaving] = useState(false)
  const [testEmailOpen, setTestEmailOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [editorInstance, setEditorInstance] = useState<any>(null)

  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error('Bitte einen Betreff eingeben')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/steps/${step.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content })
      })

      if (!res.ok) throw new Error('Speichern fehlgeschlagen')

      onSave({ ...step, subject, content })
      toast.success('E-Mail gespeichert')
    } catch {
      toast.error('Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error('Bitte eine E-Mail-Adresse eingeben')
      return
    }

    setSendingTest(true)
    try {
      const res = await fetch('/api/send/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject,
          content
        })
      })

      if (!res.ok) throw new Error('Fehler beim Senden')

      toast.success('Test-E-Mail gesendet')
      setTestEmailOpen(false)
    } catch {
      toast.error('Test-E-Mail konnte nicht gesendet werden')
    } finally {
      setSendingTest(false)
    }
  }

  const insertVariable = (key: string) => {
    if (editorInstance) {
      editorInstance.chain().focus().insertContent(`{{${key}}}`).run()
    }
  }

  // Generate preview HTML
  const getPreviewHtml = useCallback(() => {
    if (!editorInstance) return ''
    
    let html = editorInstance.getHTML()
    
    // Replace variables with examples
    variables.forEach(v => {
      html = html.replace(new RegExp(`{{${v.key}}}`, 'g'), v.example)
    })
    
    return html
  }, [editorInstance])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zurück zur Sequenz</TooltipContent>
          </Tooltip>
          <div>
            <h1 className="text-xl font-bold">E-Mail bearbeiten</h1>
            <p className="text-sm text-muted-foreground">Step {step.order + 1}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={() => setTestEmailOpen(true)}>
                <Send className="mr-2 h-4 w-4" />
                Test senden
              </Button>
            </TooltipTrigger>
            <TooltipContent>Test-E-Mail an dich senden</TooltipContent>
          </Tooltip>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Speichert...' : 'Speichern'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-2 h-4 w-4" />
            Vorschau
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4">
          {/* Subject */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Betreff</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="z.B. Willkommen, {{firstName}}!"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Tipp: Nutze {"{{firstName}}"} für den Vornamen
              </p>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Inhalt</CardTitle>
                
                {/* Variable Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Variablen:</span>
                  {variables.map(v => (
                    <Tooltip key={v.key}>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => insertVariable(v.key)}
                        >
                          {`{{${v.key}}}`}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{v.label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TiptapEditor
                content={content}
                onChange={setContent}
                onEditorReady={setEditorInstance}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">E-Mail Vorschau</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                {/* Email Header */}
                <div className="bg-muted p-4 border-b">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">An:</span>
                      <span className="text-sm text-muted-foreground">max@beispiel.de</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Betreff:</span>
                      <span className="text-sm">
                        {subject.replace(/{{firstName}}/g, 'Max').replace(/{{email}}/g, 'max@beispiel.de')}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Email Body */}
                <div 
                  className="p-6 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Email Dialog */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test-E-Mail senden</DialogTitle>
            <DialogDescription>
              Sende eine Test-E-Mail um das Ergebnis zu prüfen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-Mail-Adresse</Label>
              <Input
                type="email"
                placeholder="deine@email.de"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Variablen werden mit Beispieldaten ersetzt.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSendTest} disabled={sendingTest}>
              {sendingTest ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {sendingTest ? 'Sendet...' : 'Senden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
