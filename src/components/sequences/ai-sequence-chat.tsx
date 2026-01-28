'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Message } from '@/components/ai/message'
import { ConversationContent } from '@/components/ai/conversation'
import { PromptInput } from '@/components/ai/prompt-input'
import { Loader } from '@/components/ai/loader'
import { Mail, Clock, Tag, FolderInput, GitBranch, Sparkles, Check, Globe, Zap, Search, User, ChevronDown, Plus, Play, FileText, Eye, History, Trash2 } from 'lucide-react'
import { ModelSelector } from '@/components/ai/model-selector'
import { EmailPreviewModal } from '@/components/sequences/email-preview-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface Step {
  id: string
  type: 'EMAIL' | 'DELAY' | 'TAG' | 'SEGMENT' | 'CONDITION'
  subject?: string | null
  body?: string | null
  delayValue?: number | null
  delayUnit?: string | null
  tagAction?: string | null
  tagValue?: string | null
  segmentName?: string | null
  conditionType?: string | null
  conditionValue?: string | null
}

const PLAN_LOADER_TEXTS = [
  'Plane Kampagne...',
  'Denkt nach...',
  'Analysiere Zielgruppe...',
  'Strukturiere Steps...',
]

const EXECUTE_LOADER_TEXTS = [
  'Generiere E-Mails...',
  'Schreibe Inhalte...',
  'Erstelle Kampagne...',
  'Formuliere Texte...',
]

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: Step[]
  stepsLoading?: boolean
}

interface SavedChat {
  id: string
  title: string
  createdAt: number
  messages: ChatMessage[]
  chatMode: 'plan' | 'execute'
}

interface CompanyProfile {
  id: string
  name: string
  companyName: string
  industry: string
  targetAudience: string
  tone: string
  products?: string
  uniqueValue?: string
  brandPersonality?: string
  coreValues?: string
  missionStatement?: string
  audiencePainPoints?: string
  audienceDesires?: string
  audienceLanguage?: string
  mainOfferings?: string
  uniqueSellingPoints?: string
  pricingInfo?: string
  customerCount?: string
  successStories?: string
  awardsCredentials?: string
  examplePhrases?: string
  wordsToAvoid?: string
  preferredCTAs?: string
}

interface MarketingContext {
  segments: Array<{ id: string; name: string; leadCount: number }>
  tags: string[]
  stats: { totalLeads: number; activeLeads: number; inactiveLeads: number }
}

const CAMPAIGN_GOALS = [
  { id: 'welcome', label: 'Willkommen heißen', icon: '👋', description: 'Neue Abonnenten begrüßen' },
  { id: 'winback', label: 'Zurückgewinnen', icon: '🔄', description: 'Inaktive reaktivieren' },
  { id: 'nurturing', label: 'Leads pflegen', icon: '🌱', description: 'Zu Kunden machen' },
  { id: 'retention', label: 'Kunden binden', icon: '💎', description: 'Nach dem Kauf' },
  { id: 'promo', label: 'Verkaufen', icon: '🎯', description: 'Angebot bewerben' },
  { id: 'custom', label: 'Eigenes Ziel', icon: '✨', description: 'Frei beschreiben' },
]

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

export function AISequenceChat({ open, onOpenChange, onApplySteps, sequenceId }: AISequenceChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [generatedSteps, setGeneratedSteps] = useState<Step[]>([])
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set())
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [allProfiles, setAllProfiles] = useState<CompanyProfile[]>([])
  const [profileLoading, setProfileLoading] = useState(true)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [onboardingAnswers, setOnboardingAnswers] = useState<Partial<CompanyProfile>>({})
  const [showGoalSelection, setShowGoalSelection] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [researchMode, setResearchMode] = useState<'none' | 'quick' | 'deep' | 'confirm'>('none')
  const [researchResult, setResearchResult] = useState<CompanyProfile | null>(null)
  const [stepsLoading, setStepsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [marketingContext, setMarketingContext] = useState<MarketingContext | null>(null)
  const [chatMode, setChatMode] = useState<'plan' | 'execute'>('plan')
  const [previewStep, setPreviewStep] = useState<Step | null>(null)
  const [savedChats, setSavedChats] = useState<SavedChat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState('')

  const CHATS_STORAGE_KEY = `ai-chats-${sequenceId}`
  const MAX_SAVED_CHATS = 10

  // Alle Chats aus localStorage laden
  const loadChatsFromStorage = (): SavedChat[] => {
    try {
      const stored = localStorage.getItem(CHATS_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Ignore errors
    }
    return []
  }

  // Chats in localStorage speichern
  const saveChatsToStorage = (chats: SavedChat[]) => {
    try {
      // Max. 10 Chats behalten
      const trimmedChats = chats.slice(0, MAX_SAVED_CHATS)
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(trimmedChats))
      setSavedChats(trimmedChats)
    } catch {
      // Ignore errors
    }
  }

  // Aktuellen Chat speichern
  const saveCurrentChat = (msgs: ChatMessage[], mode: 'plan' | 'execute') => {
    if (msgs.length <= 1) return
    
    const chats = loadChatsFromStorage()
    const firstUserMsg = msgs.find(m => m.role === 'user')
    const title = firstUserMsg?.content?.slice(0, 50) || `Chat vom ${new Date().toLocaleDateString('de-DE')}`
    
    if (currentChatId) {
      // Bestehenden Chat updaten
      const idx = chats.findIndex(c => c.id === currentChatId)
      if (idx >= 0) {
        chats[idx] = { ...chats[idx], messages: msgs, chatMode: mode }
      }
    } else {
      // Neuen Chat erstellen
      const newChat: SavedChat = {
        id: `chat-${Date.now()}`,
        title,
        createdAt: Date.now(),
        messages: msgs,
        chatMode: mode
      }
      chats.unshift(newChat)
      setCurrentChatId(newChat.id)
    }
    
    saveChatsToStorage(chats)
  }

  // Chat laden
  const loadChat = (chat: SavedChat) => {
    setMessages(chat.messages)
    setChatMode(chat.chatMode)
    setCurrentChatId(chat.id)
    setShowGoalSelection(false)
    
    const lastMsgWithSteps = [...chat.messages].reverse().find(m => m.steps?.length)
    if (lastMsgWithSteps?.steps) {
      setGeneratedSteps(lastMsgWithSteps.steps)
      setSelectedStepIds(new Set(lastMsgWithSteps.steps.map(s => s.id)))
    }
  }

  // Chat löschen
  const deleteChat = (chatId: string) => {
    const chats = loadChatsFromStorage().filter(c => c.id !== chatId)
    saveChatsToStorage(chats)
    if (currentChatId === chatId) {
      startNewChat()
    }
  }

  // Neuen Chat starten
  const startNewChat = () => {
    setCurrentChatId(null)
    setMessages([])
    setGeneratedSteps([])
    setSelectedStepIds(new Set())
    setChatMode('plan')
    setShowGoalSelection(true)
    
    if (companyProfile) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hey ${companyProfile.companyName}! 👋\n\nWas möchtest du heute erreichen?`
      }])
    }
  }

  // Chat speichern bei Änderungen
  useEffect(() => {
    if (messages.length > 1) {
      saveCurrentChat(messages, chatMode)
    }
  }, [messages, chatMode])

  // Chats beim Öffnen laden
  useEffect(() => {
    if (open) {
      setSavedChats(loadChatsFromStorage())
    }
  }, [open])

  // Lade Profil und Marketing-Kontext beim Öffnen
  useEffect(() => {
    if (open) {
      loadProfile()
      loadMarketingContext()
    }
  }, [open])

  const loadMarketingContext = async () => {
    try {
      const res = await fetch('/api/ai/marketing-context')
      if (res.ok) {
        const data = await res.json()
        setMarketingContext(data)
      }
    } catch {
      // Silently fail - context is optional
    }
  }

  const loadProfile = async () => {
    setProfileLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setAllProfiles(data.profiles || [])
        
        if (data.activeProfile) {
          setCompanyProfile(data.activeProfile)
          
          // Versuche letzten Chat zu laden
          const chats = loadChatsFromStorage()
          if (chats.length > 0) {
            loadChat(chats[0])
          } else {
            setShowGoalSelection(true)
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: `Hey ${data.activeProfile.companyName}! 👋\n\nWas möchtest du heute erreichen?`
            }])
          }
        } else {
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

  const switchProfile = async (profileId: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeProfileId: profileId })
      })
      if (res.ok) {
        const data = await res.json()
        setCompanyProfile(data.activeProfile)
        setAllProfiles(data.profiles)
        setShowGoalSelection(true)
        setMessages([{
          id: `switch-${Date.now()}`,
          role: 'assistant',
          content: `Alles klar, ich arbeite jetzt mit dem Profil "${data.activeProfile.companyName}"! 🔄\n\nWas möchtest du erreichen?`
        }])
        toast.success(`Profil gewechselt zu ${data.activeProfile.companyName}`)
      }
    } catch {
      toast.error('Fehler beim Wechseln')
    }
  }

  const startNewProfile = () => {
    setCompanyProfile(null)
    setOnboardingStep(0)
    setOnboardingAnswers({})
    setShowGoalSelection(false)
    setResearchMode('none')
    setMessages([{
      id: 'new-profile',
      role: 'assistant',
      content: 'Lass uns ein neues Profil erstellen! 🆕\n\nWie möchtest du starten?'
    }])
  }

  const saveProfile = async (profile: CompanyProfile) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyProfile: profile })
      })
      setCompanyProfile(profile)
      setAllProfiles(prev => [...prev, profile])
      setShowGoalSelection(true)
      toast.success('Profil gespeichert!')
    } catch {
      toast.error('Fehler beim Speichern')
    }
  }

  const resetProfile = () => {
    setCompanyProfile(null)
    setOnboardingStep(0)
    setOnboardingAnswers({})
    setShowGoalSelection(false)
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
      setShowGoalSelection(true)
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

  const handleGoalSelect = (goalId: string) => {
    setShowGoalSelection(false)
    const goal = CAMPAIGN_GOALS.find(g => g.id === goalId)
    if (!goal || goalId === 'custom') return
    const prompt = `Erstelle eine ${goal.label}-Kampagne für mein Unternehmen`
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
          sequenceId,
          mode: chatMode
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

      // Auto-Switch: KI signalisiert dass User dem Plan zugestimmt hat
      if (data.shouldExecute && chatMode === 'plan' && data.steps?.length > 0) {
        setChatMode('execute')
        const targetMessageId = assistantMessage.id
        
        // Steps auf loading setzen (ausgegraut)
        setMessages(prev => prev.map(msg => 
          msg.id === targetMessageId 
            ? { ...msg, stepsLoading: true }
            : msg
        ))
        
        // Erneuter API-Call im Execute-Modus um E-Mail-Bodies zu generieren
        const executeRes = await fetch('/api/ai/chat-sequence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage, { role: 'assistant', content: data.message }].map(m => ({ role: m.role, content: m.content })),
            companyProfile,
            sequenceId,
            mode: 'execute'
          })
        })

        if (executeRes.ok) {
          const executeData = await executeRes.json()
          
          // Steps in-place updaten (gleiche Message, keine neue)
          setMessages(prev => prev.map(msg => 
            msg.id === targetMessageId 
              ? { 
                  ...msg, 
                  steps: executeData.steps, 
                  stepsLoading: false,
                  content: executeData.message || msg.content
                }
              : msg
          ))
          
          if (executeData.steps?.length > 0) {
            setGeneratedSteps(executeData.steps)
            setSelectedStepIds(new Set(executeData.steps.map((s: Step) => s.id)))
          }
        } else {
          // Bei Fehler loading zurücksetzen
          setMessages(prev => prev.map(msg => 
            msg.id === targetMessageId 
              ? { ...msg, stepsLoading: false }
              : msg
          ))
        }
        
        setLoading(false)
        setStepsLoading(false)
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
        <SheetHeader className="px-8 md:px-12 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              KI Sequenz-Builder
            </SheetTitle>
            <div className="flex items-center gap-2">
              {savedChats.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <History className="w-4 h-4 mr-1" />
                      History ({savedChats.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <div className="p-2">
                      <Input
                        placeholder="Chats durchsuchen..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <DropdownMenuSeparator />
                    <ScrollArea className="max-h-60">
                      {savedChats
                        .filter(c => !historySearch || c.title.toLowerCase().includes(historySearch.toLowerCase()))
                        .map(chat => (
                          <DropdownMenuItem
                            key={chat.id}
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => loadChat(chat)}
                          >
                            <div className="flex-1 min-w-0 mr-2">
                              <p className="text-sm truncate">{chat.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(chat.createdAt).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteChat(chat.id)
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </DropdownMenuItem>
                        ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={startNewChat}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4 mr-1" />
                Neuer Chat
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat-Bereich */}
          <div className="flex-1 flex flex-col min-w-0">
            {profileLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader text="Lade Profil..." />
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1">
                  <ConversationContent className="px-8 md:px-12 lg:px-16 max-w-3xl mx-auto">
                    {messages.map(msg => (
                      <div key={msg.id}>
                        <Message role={msg.role}>
                          {msg.content}
                        </Message>
                        {/* Steps als Karten im Chat anzeigen */}
                        {msg.steps && msg.steps.length > 0 && (
                          <div className="ml-11 mt-2 relative">
                            <div className={`space-y-2 transition-opacity duration-300 ${msg.stepsLoading ? 'opacity-30 pointer-events-none' : ''}`}>
                              {msg.steps.map((step, index) => {
                                const Icon = STEP_ICONS[step.type]
                                return (
                                  <div 
                                    key={step.id}
                                    className="p-3 rounded-lg border bg-card animate-in fade-in slide-in-from-top duration-300"
                                    style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
                                  >
                                    <div className="flex items-start gap-3">
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
                                      {step.type === 'EMAIL' && step.body && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 flex-shrink-0"
                                          onClick={() => setPreviewStep(step)}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            {/* Overlay mit Loader mittig über den Steps */}
                            {msg.stepsLoading && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-background/80 backdrop-blur-sm rounded-lg px-6 py-3 border shadow-sm">
                                  <Loader rotatingTexts={EXECUTE_LOADER_TEXTS} />
                                </div>
                              </div>
                            )}
                            {/* Buttons nur anzeigen wenn nicht loading */}
                            {!msg.stepsLoading && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    onApplySteps(msg.steps!)
                                    onOpenChange(false)
                                    toast.success(`${msg.steps!.length} Steps übernommen`)
                                  }}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Alle übernehmen
                                </Button>
                                {msg.steps!.some(s => s.type === 'EMAIL' && s.body) && (
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const stepsWithoutBody = msg.steps!.map(s => 
                                        s.type === 'EMAIL' ? { ...s, body: null } : s
                                      )
                                      onApplySteps(stepsWithoutBody)
                                      onOpenChange(false)
                                      toast.success(`${msg.steps!.length} Steps übernommen (ohne E-Mail-Texte)`)
                                    }}
                                  >
                                    Ohne E-Mail-Texte
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {loading && !messages.some(m => m.stepsLoading) && (
                      <Message role="assistant">
                        <Loader 
                          rotatingTexts={chatMode === 'plan' ? PLAN_LOADER_TEXTS : EXECUTE_LOADER_TEXTS}
                        />
                      </Message>
                    )}

                    {/* Goal Selection nach Begrüßung */}
                    {showGoalSelection && !loading && (
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {CAMPAIGN_GOALS.map((goal) => (
                          <Button
                            key={goal.id}
                            variant="outline"
                            size="sm"
                            className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                            onClick={() => handleGoalSelect(goal.id)}
                          >
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <span>{goal.icon}</span>
                              {goal.label}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal">
                              {goal.description}
                            </span>
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
                <div className="px-8 md:px-12 lg:px-16 pb-6 max-w-3xl mx-auto w-full">
                  <PromptInput 
                    onSubmit={handleSubmit}
                    placeholder={!companyProfile ? 'Antwort eingeben...' : 'Beschreibe deine Kampagne...'}
                    loading={loading}
                    actions={
                      <>
                        {companyProfile && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                              >
                                <User className="w-4 h-4" />
                                <span className="text-sm">{companyProfile.companyName}</span>
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {allProfiles.map(profile => (
                                <DropdownMenuItem 
                                  key={profile.id}
                                  onClick={() => switchProfile(profile.id)}
                                  className={profile.id === companyProfile.id ? 'bg-muted' : ''}
                                >
                                  {profile.companyName}
                                  {profile.id === companyProfile.id && (
                                    <Check className="w-4 h-4 ml-auto" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={startNewProfile}>
                                <Plus className="w-4 h-4 mr-2" />
                                Neues Profil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                          <Button
                            variant={chatMode === 'plan' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setChatMode('plan')}
                            disabled={loading}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Plan
                          </Button>
                          <Button
                            variant={chatMode === 'execute' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setChatMode('execute')}
                            disabled={loading}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Ausführen
                          </Button>
                        </div>
                        <ModelSelector disabled={loading} />
                      </>
                    }
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </SheetContent>

      {/* E-Mail Preview Modal */}
      <EmailPreviewModal
        open={!!previewStep}
        onOpenChange={(open) => !open && setPreviewStep(null)}
        subject={previewStep?.subject || ''}
        body={previewStep?.body || ''}
        companyName={companyProfile?.companyName}
      />
    </Sheet>
  )
}
