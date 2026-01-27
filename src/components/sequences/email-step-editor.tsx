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
  Loader2,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bot
} from 'lucide-react'
import { tiptapToPlainText, SpamCheckResult, SpamIssue } from '@/lib/spam-check'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { TiptapEditor } from './tiptap-editor'
import { emailTemplates, EmailTemplate } from '@/lib/email-templates'

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

interface SpamCheckApiResult {
  local: SpamCheckResult
  postmark?: {
    score: number
    rules: Array<{ score: number; description: string }>
  }
  openai?: {
    analysis: string
  }
  overall: {
    score: number
    level: 'good' | 'warning' | 'bad'
  }
}

const variables = [
  { key: 'firstName', label: 'Vorname', example: 'Max' },
  { key: 'email', label: 'E-Mail', example: 'max@beispiel.de' },
  // unsubscribe_link wird automatisch im Footer eingefügt - nicht manuell nötig
]

export function EmailStepEditor({ step, sequenceId, onSave, onCancel }: EmailStepEditorProps) {
  const [subject, setSubject] = useState(step.subject || '')
  const [content, setContent] = useState(step.content)
  const [saving, setSaving] = useState(false)
  const [testEmailOpen, setTestEmailOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [editorInstance, setEditorInstance] = useState<any>(null)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [spamCheckOpen, setSpamCheckOpen] = useState(false)
  const [spamCheckLoading, setSpamCheckLoading] = useState(false)
  const [spamCheckResult, setSpamCheckResult] = useState<SpamCheckApiResult | null>(null)

  const applyTemplate = (template: EmailTemplate) => {
    // Check if there's existing content
    const hasContent = content?.content?.some((node: any) => 
      node.content?.some((child: any) => child.text?.trim())
    )
    
    if (hasContent) {
      setSelectedTemplate(template)
      setTemplateDialogOpen(true)
    } else {
      confirmApplyTemplate(template)
    }
  }

  const confirmApplyTemplate = (template: EmailTemplate) => {
    setSubject(template.subject)
    setContent(template.content)
    if (editorInstance) {
      editorInstance.commands.setContent(template.content)
    }
    setTemplateDialogOpen(false)
    setSelectedTemplate(null)
    toast.success(`Template "${template.name}" angewendet`)
  }

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

  const handleSpamCheck = async () => {
    if (!subject.trim() && !content) {
      toast.error('Bitte Betreff oder Inhalt eingeben')
      return
    }

    setSpamCheckLoading(true)
    setSpamCheckOpen(true)
    setSpamCheckResult(null)

    try {
      const res = await fetch('/api/spam-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content })
      })

      if (!res.ok) throw new Error('Spam-Check fehlgeschlagen')

      const result = await res.json()
      setSpamCheckResult(result)
    } catch {
      toast.error('Spam-Check fehlgeschlagen')
      setSpamCheckOpen(false)
    } finally {
      setSpamCheckLoading(false)
    }
  }

  const getScoreColor = (level: 'good' | 'warning' | 'bad') => {
    switch (level) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'bad': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getScoreIcon = (level: 'good' | 'warning' | 'bad') => {
    switch (level) {
      case 'good': return <CheckCircle2 className="h-5 w-5" />
      case 'warning': return <AlertTriangle className="h-5 w-5" />
      case 'bad': return <XCircle className="h-5 w-5" />
    }
  }

  // Generate preview HTML with styled buttons
  const getPreviewHtml = useCallback(() => {
    if (!editorInstance) return ''
    
    let html = editorInstance.getHTML()
    
    // Replace variables with examples
    variables.forEach(v => {
      html = html.replace(new RegExp(`{{${v.key}}}`, 'g'), v.example)
    })
    
    // Transform arrow links to styled buttons
    html = html.replace(
      /<a([^>]*href="([^"]*)"[^>]*)>→\s*([^<]+)<\/a>/gi,
      `<a$1 style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">$3</a>`
    )
    
    // Style unsubscribe links
    html = html.replace(
      /<a([^>]*)>([^<]*[Aa]bmelden[^<]*)<\/a>/gi,
      `<a$1 style="color: #666; font-size: 12px; text-decoration: underline;">$2</a>`
    )
    
    return html
  }, [editorInstance])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
              <Button variant="outline" onClick={handleSpamCheck} disabled={spamCheckLoading}>
                {spamCheckLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Spam-Check
              </Button>
            </TooltipTrigger>
            <TooltipContent>E-Mail auf Spam-Risiko prüfen</TooltipContent>
          </Tooltip>

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
          {/* Templates */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Templates</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {emailTemplates.map((template) => (
                  <Tooltip key={template.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 px-3"
                        onClick={() => applyTemplate(template)}
                      >
                        <FileText className="mr-2 h-3.5 w-3.5" />
                        {template.name}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>

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
              {/* Email Preview Container - Resend Style */}
              <div className="bg-[#f5f5f5] rounded-lg p-6">
                {/* Email Header */}
                <div className="max-w-[600px] mx-auto mb-4">
                  <div className="bg-white rounded-t-lg p-4 border-b">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">An:</span>
                        <span className="text-sm">max@beispiel.de</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Betreff:</span>
                        <span className="text-sm font-medium">
                          {subject.replace(/{{firstName}}/g, 'Max').replace(/{{email}}/g, 'max@beispiel.de')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Email Body - Styled Container */}
                <div className="max-w-[600px] mx-auto bg-white rounded-lg shadow-sm">
                  <div 
                    className="p-10"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                  >
                    <div 
                      className="text-base leading-7 text-black [&>p]:mb-4 [&>p:last-child]:mb-0"
                      dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                    />
                  </div>
                </div>
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

      {/* Template Confirmation Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template anwenden?</DialogTitle>
            <DialogDescription>
              Der aktuelle Inhalt wird durch das Template ersetzt. Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => selectedTemplate && confirmApplyTemplate(selectedTemplate)}>
              Template anwenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spam Check Dialog */}
      <Dialog open={spamCheckOpen} onOpenChange={setSpamCheckOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Spam-Check Ergebnis
            </DialogTitle>
          </DialogHeader>
          
          {spamCheckLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Analysiere E-Mail...</p>
            </div>
          ) : spamCheckResult ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Overall Score */}
                <div className={`flex items-center justify-between p-4 rounded-lg border ${getScoreColor(spamCheckResult.overall.level)}`}>
                  <div className="flex items-center gap-3">
                    {getScoreIcon(spamCheckResult.overall.level)}
                    <div>
                      <p className="font-semibold">Gesamt-Score</p>
                      <p className="text-sm opacity-80">
                        {spamCheckResult.overall.level === 'good' && 'Sieht gut aus!'}
                        {spamCheckResult.overall.level === 'warning' && 'Einige Verbesserungen möglich'}
                        {spamCheckResult.overall.level === 'bad' && 'Hohes Spam-Risiko'}
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {spamCheckResult.overall.score}/10
                  </div>
                </div>

                {/* Local Analysis */}
                {spamCheckResult.local.issues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      Lokale Analyse
                    </h4>
                    <div className="space-y-1">
                      {spamCheckResult.local.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                          <Badge variant="outline" className="shrink-0">+{issue.points}</Badge>
                          <span>{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Postmark Results */}
                {spamCheckResult.postmark && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      SpamAssassin (Postmark)
                      <Badge variant="secondary">Score: {spamCheckResult.postmark.score.toFixed(1)}</Badge>
                    </h4>
                    {spamCheckResult.postmark.rules.length > 0 ? (
                      <div className="space-y-1">
                        {spamCheckResult.postmark.rules.map((rule, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                            <Badge variant="outline" className="shrink-0">+{rule.score.toFixed(1)}</Badge>
                            <span className="text-muted-foreground">{rule.description}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground p-2 bg-green-50 rounded border border-green-200">
                        Keine SpamAssassin-Regeln ausgelöst
                      </p>
                    )}
                  </div>
                )}

                {/* OpenAI Analysis */}
                {spamCheckResult.openai && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      KI-Analyse
                    </h4>
                    <div className="text-sm p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                      {spamCheckResult.openai.analysis}
                    </div>
                  </div>
                )}

                {/* Tips wenn Score schlecht */}
                {spamCheckResult.overall.level === 'bad' && (
                  <div className="text-sm p-3 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
                    <p className="font-medium mb-1">Tipps zur Verbesserung:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Vermeide Wörter wie GRATIS, KOSTENLOS, JETZT</li>
                      <li>Weniger Ausrufezeichen und Großbuchstaben</li>
                      <li>Personalisiere den Betreff mit {"{{firstName}}"}</li>
                      <li>Halte den Text natürlich und persönlich</li>
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setSpamCheckOpen(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
