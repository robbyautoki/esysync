import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

interface CompanyProfile {
  companyName: string
  industry: string
  targetAudience: string
  tone: string
  products?: string
  uniqueValue?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

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

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return NextResponse.json({ error: 'OpenAI API Key nicht konfiguriert' }, { status: 500 })
  }

  try {
    const { messages, companyProfile, sequenceId } = await req.json() as {
      messages: ChatMessage[]
      companyProfile: CompanyProfile | null
      sequenceId: string
    }

    const systemPrompt = buildSystemPrompt(companyProfile)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        functions: [
          {
            name: 'generate_sequence_steps',
            description: 'Generiert eine Liste von Sequenz-Steps basierend auf der Kampagnenbeschreibung',
            parameters: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Eine freundliche Nachricht die den Vorschlag erklärt'
                },
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['EMAIL', 'DELAY', 'TAG', 'SEGMENT', 'CONDITION']
                      },
                      subject: {
                        type: 'string',
                        description: 'Betreff für EMAIL Steps'
                      },
                      delayValue: {
                        type: 'number',
                        description: 'Wartezeit für DELAY Steps'
                      },
                      delayUnit: {
                        type: 'string',
                        enum: ['minutes', 'hours', 'days'],
                        description: 'Einheit für DELAY Steps'
                      },
                      tagAction: {
                        type: 'string',
                        enum: ['add', 'remove'],
                        description: 'Aktion für TAG Steps'
                      },
                      tagValue: {
                        type: 'string',
                        description: 'Tag-Name für TAG Steps'
                      },
                      segmentName: {
                        type: 'string',
                        description: 'Segment-Name für SEGMENT Steps'
                      },
                      conditionType: {
                        type: 'string',
                        enum: ['HAS_TAG', 'IN_SEGMENT', 'OPENED_EMAIL', 'CLICKED_EMAIL'],
                        description: 'Bedingungstyp für CONDITION Steps'
                      },
                      conditionValue: {
                        type: 'string',
                        description: 'Wert für die Bedingung'
                      }
                    },
                    required: ['type']
                  }
                }
              },
              required: ['message', 'steps']
            }
          }
        ],
        function_call: 'auto'
      })
    })

    if (!response.ok) {
      throw new Error('OpenAI API Fehler')
    }

    const data = await response.json()
    const assistantMessage = data.choices[0].message

    // Prüfe ob Function Call
    if (assistantMessage.function_call?.name === 'generate_sequence_steps') {
      const args = JSON.parse(assistantMessage.function_call.arguments)
      
      // IDs für Steps generieren
      const stepsWithIds: Step[] = args.steps.map((step: Omit<Step, 'id'>, index: number) => ({
        ...step,
        id: `ai-step-${Date.now()}-${index}`
      }))

      return NextResponse.json({
        message: args.message,
        steps: stepsWithIds
      })
    }

    // Normale Text-Antwort
    return NextResponse.json({
      message: assistantMessage.content || 'Ich verstehe. Kannst du mir mehr Details geben?',
      steps: []
    })

  } catch (error) {
    console.error('Chat sequence error:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Generierung' },
      { status: 500 }
    )
  }
}

function buildSystemPrompt(profile: CompanyProfile | null): string {
  const basePrompt = `Du bist ein erfahrener E-Mail-Marketing-Experte und hilfst beim Erstellen von E-Mail-Sequenzen/Kampagnen.

DEINE AUFGABE:
- Verstehe was der User für eine Kampagne braucht
- Erstelle optimale Sequenz-Steps basierend auf Best Practices
- Erkläre kurz und freundlich warum du diese Steps vorschlägst

VERFÜGBARE STEP-TYPEN:
1. EMAIL - E-Mail versenden (braucht subject: Betreffzeile)
2. DELAY - Wartezeit (braucht delayValue und delayUnit: minutes/hours/days)
3. TAG - Tag hinzufügen/entfernen (braucht tagAction: add/remove und tagValue)
4. SEGMENT - Lead in Segment verschieben (braucht segmentName)
5. CONDITION - Verzweigung basierend auf Bedingung (braucht conditionType und conditionValue)

CONDITION TYPES:
- HAS_TAG: Prüft ob Lead einen bestimmten Tag hat
- IN_SEGMENT: Prüft ob Lead in einem Segment ist
- OPENED_EMAIL: Prüft ob Lead eine bestimmte E-Mail geöffnet hat
- CLICKED_EMAIL: Prüft ob Lead in einer E-Mail geklickt hat

BEST PRACTICES:
- Willkommensserien: 3-5 E-Mails, 2-3 Tage Abstand
- Re-Engagement: 2-3 E-Mails mit steigender Dringlichkeit
- Onboarding: 5-7 E-Mails, 1-2 Tage Abstand
- Nach wichtigen Aktionen: TAG setzen für Tracking
- Bei Inaktivität: CONDITION nutzen um unterschiedlich zu reagieren

SPRACHE: Deutsch (informell, du-Form)
TONALITÄT: Freundlich, hilfreich, kompetent

Wenn der User eine Kampagne beschreibt, rufe IMMER die Funktion generate_sequence_steps auf.
Frage nach wenn wichtige Details fehlen (Ziel, Zielgruppe, Anzahl E-Mails).`

  if (profile) {
    return `${basePrompt}

UNTERNEHMENSPROFIL:
- Firma: ${profile.companyName}
- Branche: ${profile.industry}
- Zielgruppe: ${profile.targetAudience}
- Tonalität: ${profile.tone}
${profile.products ? `- Produkte/Services: ${profile.products}` : ''}
${profile.uniqueValue ? `- USP: ${profile.uniqueValue}` : ''}

Passe deine Vorschläge an dieses Profil an. Nutze passende Betreffzeilen für die Branche und Zielgruppe.`
  }

  return basePrompt
}
