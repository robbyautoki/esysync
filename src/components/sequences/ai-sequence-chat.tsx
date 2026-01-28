'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Message } from '@/components/ai/message'
import { Conversation, ConversationContent } from '@/components/ai/conversation'
import { PromptInput } from '@/components/ai/prompt-input'
import { Loader } from '@/components/ai/loader'
import { Mail, Clock, Tag, FolderInput, GitBranch, Sparkles, Check, RefreshCw, Globe, Zap, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Step {
  id: string
  type: 'EMAIL' | 'DELAY' | 'TAG' | 'SEGMENT' | 'CONDITION'
  subject?: string | null
  delayValue?: number | null
  delayUnit?: string | null
  tagAction?: string | null
  tagValue?: string | null
  segmentName?: string | null
  conditionType?: string | null
  conditionValue?: string | null
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: Step[]
}

interface CompanyProfile {
  companyName: string
  industry: string
  targetAudience: string
  tone: string
  products?: string
  uniqueValue?: string
}

interface AISequenceChatProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplySteps: (steps: Step[]) => void
  sequenceId: string
}

const STEP_ICONS = {
  EMAIL: Mail,
  DELAY: Clock,
  TAG: Tag,
  SEGMENT: FolderInput,
  CONDITION: GitBranch,
}

const STEP_COLORS = {
  EMAIL: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  DELAY: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  TAG: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  SEGMENT: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
  CONDITION: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
}

const ONBOARDING_QUESTIONS = [
  { key: 'companyName', question: 'Wie heißt dein Unternehmen?' },
  { key: 'industry', question: 'In welcher Branche bist du tätig? (z.B. E-Commerce, SaaS, Agentur)' },
  { key: 'targetAudience', question: 'Wer ist deine Zielgruppe? (z.B. B2B Entscheider, Online-Shopper)' },
  { key: 'tone', question: 'Welchen Ton sollen die E-Mails haben? (z.B. professionell, locker, freundlich)' },
]

const QUICK_ACTIONS = [
  { label: 'Willkommens-Serie', prompt: 'Erstelle eine Willkommens-Serie für neue Newsletter-Abonnenten mit 3-4 E-Mails' },
  { label: 'Re-Engagement', prompt: 'Erstelle eine Re-Engagement-Kampagne für inaktive Kunden' },
  { label: 'Onboarding', prompt: 'Erstelle eine Onboarding-Serie für neue Nutzer mit Produkt-Tipps' },
  { label: 'Newsletter-Serie', prompt: 'Erstelle eine regelmäßige Newsletter-Serie mit wertvollen Inhalten' },
]

export function AISequenceChat({ open, onOpenChange, onApplySteps, sequenceId }: AISequenceChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [generatedSteps, setGeneratedSteps] = useState<Step[]>([])
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set())
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [onboardingAnswers, setOnboardingAnswers] = useState<Partial<CompanyProfile>>({})
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [researchMode, setResearchMode] = useState<'none' | 'quick' | 'deep' | 'confirm'>('none')
  const [researchResult, setResearchResult] = useState<CompanyProfile | null>(null)
  const [stepsLoading, setStepsLoading] = useState(false)

  // Lade Unternehmensprofil beim Öffnen
  useEffect(() => {
    if (open) {
      loadProfile()
    }
  }, [open])

  const loadProfile = async () => {
    setProfileLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.companyProfile) {
          setCompanyProfile(data.companyProfile)
          setShowQuickActions(true)
          // Begrüßung mit Profil
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Hey ${data.companyProfile.companyName}! 👋\n\nWas für eine Kampagne möchtest du erstellen?`
          }])
        } else {
          // Onboarding starten
          setMessages([{
            id: 'onboarding-start',
            role: 'assistant',
            content: 'Willkommen! 🚀 Bevor wir loslegen, möchte ich dein Unternehmen kennenlernen.\n\nWie möchtest du starten?'
          }])
          setResearchMode('none')
        }
      }
    } catch {
      toast.error('Fehler beim Laden des Profils')
    } finally {
      setProfileLoading(false)
    }
  }

  const saveProfile = async (profile: CompanyProfile) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyProfile: profile })
      })
      setCompanyProfile(profile)
      setShowQuickActions(true)
      toast.success('Profil gespeichert!')
    } catch {
      toast.error('Fehler beim Speichern')
    }
  }

  const resetProfile = () => {
    setCompanyProfile(null)
    setOnboardingStep(0)
    setOnboardingAnswers({})
    setShowQuickActions(false)
    setResearchMode('none')
    setMessages([{
      id: 'reset',
      role: 'assistant',
      content: 'Okay, lass uns von vorne starten! 🔄\n\nWie möchtest du dein Unternehmensprofil erstellen?'
    }])
  }

  const startResearch = async (deep: boolean) => {
    if (!websiteUrl.trim()) {
      toast.error('Bitte gib eine URL ein')
      return
    }

    setMessages(prev => [...prev, {
      id: `user-url-${Date.now()}`,
      role: 'user',
      content: websiteUrl
    }])

    setLoading(true)
    setResearchMode(deep ? 'deep' : 'quick')

    try {
      const res = await fetch('/api/ai/research-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl, deep })
      })

      if (!res.ok) throw new Error('Fehler bei der Recherche')

      const data = await res.json()
      setResearchResult(data.profile)
      setResearchMode('confirm')

      setMessages(prev => [...prev, {
        id: `research-result-${Date.now()}`,
        role: 'assistant',
        content: `Hier ist meine Zusammenfassung:\n\n• **Unternehmen:** ${data.profile.companyName}\n• **Branche:** ${data.profile.industry}\n• **Zielgruppe:** ${data.profile.targetAudience}\n• **Tonalität:** ${data.profile.tone}\n${data.profile.products ? `• **Produkte:** ${data.profile.products}` : ''}\n\nPasst das so?`
      }])
    } catch {
      toast.error('Recherche fehlgeschlagen')
      setResearchMode('none')
    } finally {
      setLoading(false)
    }
  }

  const confirmResearch = async (confirmed: boolean) => {
    if (confirmed && researchResult) {
      await saveProfile(researchResult)
      setMessages(prev => [...prev, {
        id: `confirmed-${Date.now()}`,
        role: 'assistant',
        content: `Perfekt! 🎉 Jetzt können wir loslegen.\n\nWas für eine Kampagne möchtest du erstellen?`
      }])
      setResearchMode('none')
      setShowQuickActions(true)
    } else {
      setResearchMode('none')
      setMessages(prev => [...prev, {
        id: `retry-${Date.now()}`,
        role: 'assistant',
        content: 'Okay, wie möchtest du fortfahren?'
      }])
    }
  }

  const startManualOnboarding = () => {
    setOnboardingStep(0)
    setMessages(prev => [...prev, {
      id: `manual-start-${Date.now()}`,
      role: 'assistant',
      content: ONBOARDING_QUESTIONS[0].question
    }])
    setResearchMode('none')
  }

  const handleQuickAction = (prompt: string) => {
    setShowQuickActions(false)
    handleSubmit(prompt)
  }

  const handleSubmit = async (input: string) => {
    // Onboarding Mode
    if (!companyProfile && onboardingStep < ONBOARDING_QUESTIONS.length) {
      const currentKey = ONBOARDING_QUESTIONS[onboardingStep].key as keyof CompanyProfile
      const newAnswers = { ...onboardingAnswers, [currentKey]: input }
      setOnboardingAnswers(newAnswers)

      // User-Nachricht hinzufügen
      setMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: 'user',
        content: input
      }])

      const nextStep = onboardingStep + 1
      setOnboardingStep(nextStep)

      if (nextStep < ONBOARDING_QUESTIONS.length) {
        // Nächste Frage
        setMessages(prev => [...prev, {
          id: `onboarding-${nextStep}`,
          role: 'assistant',
          content: `Super! ${ONBOARDING_QUESTIONS[nextStep].question}`
        }])
      } else {
        // Onboarding fertig
        const profile = newAnswers as CompanyProfile
        await saveProfile(profile)
        setMessages(prev => [...prev, {
          id: 'onboarding-done',
          role: 'assistant',
          content: `Perfekt, ${profile.companyName}! Ich hab mir alles gemerkt. 🎉\n\nJetzt können wir loslegen! Was für eine Kampagne möchtest du erstellen?`
        }])
      }
      return
    }

    // Normale Chat-Nachricht
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input
    }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    setStepsLoading(true)
    setGeneratedSteps([])

    try {
      const res = await fetch('/api/ai/chat-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          companyProfile,
          sequenceId
        })
      })

      if (!res.ok) throw new Error('Fehler bei der Generierung')

      const data = await res.json()
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        steps: data.steps
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      if (data.steps?.length > 0) {
        setGeneratedSteps(data.steps)
        setSelectedStepIds(new Set(data.steps.map((s: Step) => s.id)))
      }
    } catch {
      toast.error('Fehler beim Generieren')
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Entschuldigung, da ist etwas schiefgelaufen. Kannst du es nochmal versuchen?'
      }])
    } finally {
      setLoading(false)
      setStepsLoading(false)
    }
  }

  const toggleStep = (stepId: string) => {
    setSelectedStepIds(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedStepIds(new Set(generatedSteps.map(s => s.id)))
  }

  const handleApply = () => {
    const selectedSteps = generatedSteps.filter(s => selectedStepIds.has(s.id))
    if (selectedSteps.length === 0) {
      toast.error('Keine Steps ausgewählt')
      return
    }
    onApplySteps(selectedSteps)
    onOpenChange(false)
    toast.success(`${selectedSteps.length} Steps übernommen`)
  }

  const getStepLabel = (step: Step) => {
    switch (step.type) {
      case 'EMAIL':
        return step.subject || 'E-Mail'
      case 'DELAY':
        return `${step.delayValue} ${step.delayUnit === 'days' ? 'Tage' : step.delayUnit === 'hours' ? 'Stunden' : 'Minuten'} warten`
      case 'TAG':
        return `Tag: ${step.tagValue} ${step.tagAction === 'add' ? 'hinzufügen' : 'entfernen'}`
      case 'SEGMENT':
        return `→ ${step.segmentName || 'Segment'}`
      case 'CONDITION':
        return `WENN ${step.conditionType}`
      default:
        return step.type
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              KI Sequenz-Builder
            </SheetTitle>
            {companyProfile && (
              <Button variant="ghost" size="sm" onClick={resetProfile}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Profil ändern
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat-Bereich (links) */}
          <div className="flex-1 flex flex-col border-r min-w-0">
            {profileLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader text="Lade Profil..." />
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1">
                  <ConversationContent className="px-6">
                    {messages.map(msg => (
                      <Message key={msg.id} role={msg.role}>
                        {msg.content}
                      </Message>
                    ))}
                    {loading && (
                      <Message role="assistant">
                        <Loader text="Generiere Kampagne..." />
                      </Message>
                    )}

                    {/* Quick Actions nach Begrüßung */}
                    {showQuickActions && !loading && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {QUICK_ACTIONS.map((action, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction(action.prompt)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Onboarding Options (Website oder Manuell) */}
                    {!companyProfile && onboardingStep === 0 && researchMode === 'none' && !loading && (
                      <div className="space-y-4 mt-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setResearchMode('quick')}
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            Website analysieren
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={startManualOnboarding}
                          >
                            Manuell eingeben
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Website URL Eingabe */}
                    {!companyProfile && (researchMode === 'quick' || researchMode === 'deep') && !loading && (
                      <div className="space-y-3 mt-4">
                        <p className="text-sm text-muted-foreground">
                          Gib mir deine Website-URL:
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://..."
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => startResearch(false)}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Schnelle Recherche
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startResearch(true)}
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Tiefe Recherche
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Recherche Bestätigung */}
                    {researchMode === 'confirm' && !loading && (
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" onClick={() => confirmResearch(true)}>
                          <Check className="w-4 h-4 mr-2" />
                          Passt so
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => confirmResearch(false)}>
                          Nochmal versuchen
                        </Button>
                      </div>
                    )}
                  </ConversationContent>
                </ScrollArea>
                <div className="px-6 pb-4">
                  <PromptInput 
                    onSubmit={handleSubmit}
                    placeholder={!companyProfile ? 'Antwort eingeben...' : 'Beschreibe deine Kampagne...'}
                    loading={loading}
                  />
                </div>
              </>
            )}
          </div>

          {/* Preview-Bereich (rechts) */}
          <div className="w-96 flex flex-col bg-muted/30">
            <div className="px-6 py-4 border-b">
              <h3 className="font-medium text-sm">Generierte Steps</h3>
              {generatedSteps.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedStepIds.size} von {generatedSteps.length} ausgewählt
                </p>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="px-6 py-4 space-y-2">
                {stepsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Wird mit KI generiert...
                    </p>
                  </div>
                ) : generatedSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Beschreibe deine Kampagne im Chat, um Steps zu generieren
                  </p>
                ) : (
                  generatedSteps.map((step, index) => {
                    const Icon = STEP_ICONS[step.type]
                    const isSelected = selectedStepIds.has(step.id)
                    return (
                      <div 
                        key={step.id}
                        className={`p-3 rounded-lg border bg-card cursor-pointer transition-colors ${
                          isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleStep(step.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleStep(step.id)}
                            className="mt-0.5"
                          />
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${STEP_COLORS[step.type]}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                {index + 1}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {step.type}
                              </span>
                            </div>
                            <p className="text-sm font-medium mt-1 break-words">
                              {getStepLabel(step)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>

            {generatedSteps.length > 0 && (
              <div className="px-6 py-4 border-t space-y-2">
                <Button 
                  className="w-full" 
                  onClick={handleApply}
                  disabled={selectedStepIds.size === 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {selectedStepIds.size === generatedSteps.length 
                    ? 'Alle übernehmen' 
                    : `${selectedStepIds.size} Steps übernehmen`}
                </Button>
                {selectedStepIds.size < generatedSteps.length && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={selectAll}
                  >
                    Alle auswählen
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
