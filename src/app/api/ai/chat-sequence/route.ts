import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

interface CompanyProfile {
  id: string
  name: string
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
  body?: string | null
  delayValue?: number | null
  delayUnit?: string | null
  tagAction?: string | null
  tagValue?: string | null
  segmentName?: string | null
  conditionType?: string | null
  conditionValue?: string | null
}

interface MarketingContext {
  segments: Array<{ id: string; name: string; leadCount: number }>
  tags: string[]
  stats: { totalLeads: number; activeLeads: number; inactiveLeads: number }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  try {
    const { messages, companyProfile, sequenceId, model = 'gpt-4o', marketingContext, mode = 'plan' } = await req.json() as {
      messages: ChatMessage[]
      companyProfile: CompanyProfile | null
      sequenceId: string
      model?: string
      marketingContext?: MarketingContext
      mode?: 'plan' | 'execute'
    }

    const systemPrompt = buildSystemPrompt(companyProfile, marketingContext, mode)
    const toolSchema = getToolSchema(mode)

    // Anthropic API
    if (model.startsWith('claude') && anthropicKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model === 'claude-3-5-sonnet' ? 'claude-3-5-sonnet-20241022' : 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          tools: [{
            name: 'generate_sequence_steps',
            description: mode === 'execute' 
              ? 'Generiert vollständige Sequenz-Steps mit E-Mail-Inhalten'
              : 'Generiert eine Struktur von Sequenz-Steps (nur Betreffs, keine E-Mail-Texte)',
            input_schema: toolSchema.anthropic
          }]
        })
      })

      if (!response.ok) {
        throw new Error('Anthropic API Fehler')
      }

      const data = await response.json()
      const content = data.content[0]

      if (content.type === 'tool_use' && content.name === 'generate_sequence_steps') {
        const args = content.input
        const stepsWithIds: Step[] = args.steps.map((step: Omit<Step, 'id'>, index: number) => ({
          ...step,
          id: `ai-step-${Date.now()}-${index}`
        }))
        return NextResponse.json({ 
          message: args.message, 
          steps: stepsWithIds,
          shouldExecute: args.shouldExecute || false
        })
      }

      return NextResponse.json({
        message: content.text || 'Ich verstehe. Kannst du mir mehr Details geben?',
        steps: []
      })
    }

    // OpenAI API (default)
    if (!openaiKey) {
      return NextResponse.json({ error: 'OpenAI API Key nicht konfiguriert' }, { status: 500 })
    }

    const openaiModel = model === 'gpt-4o-mini' ? 'gpt-4o-mini' : 'gpt-4o'

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        functions: [
          {
            name: 'generate_sequence_steps',
            description: mode === 'execute' 
              ? 'Generiert vollständige Sequenz-Steps mit E-Mail-Inhalten'
              : 'Generiert eine Struktur von Sequenz-Steps (nur Betreffs, keine E-Mail-Texte)',
            parameters: toolSchema.openai
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

    if (assistantMessage.function_call?.name === 'generate_sequence_steps') {
      const args = JSON.parse(assistantMessage.function_call.arguments)
      const stepsWithIds: Step[] = args.steps.map((step: Omit<Step, 'id'>, index: number) => ({
        ...step,
        id: `ai-step-${Date.now()}-${index}`
      }))

      return NextResponse.json({
        message: args.message,
        steps: stepsWithIds,
        shouldExecute: args.shouldExecute || false
      })
    }

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

function getToolSchema(mode: 'plan' | 'execute') {
  const baseStepProperties = {
    type: { type: 'string', enum: ['EMAIL', 'DELAY', 'TAG', 'SEGMENT', 'CONDITION'] },
    subject: { type: 'string', description: 'Betreff für EMAIL Steps' },
    delayValue: { type: 'number', description: 'Wartezeit für DELAY Steps' },
    delayUnit: { type: 'string', enum: ['minutes', 'hours', 'days'] },
    tagAction: { type: 'string', enum: ['add', 'remove'] },
    tagValue: { type: 'string', description: 'Tag-Name für TAG Steps' },
    segmentName: { type: 'string', description: 'Segment-Name für SEGMENT Steps' },
    conditionType: { type: 'string', enum: ['HAS_TAG', 'IN_SEGMENT', 'OPENED_EMAIL', 'CLICKED_EMAIL'] },
    conditionValue: { type: 'string', description: 'Wert für die Bedingung' }
  }

  const executeStepProperties = {
    ...baseStepProperties,
    body: { 
      type: 'string', 
      description: 'Vollständiger HTML E-Mail-Inhalt für EMAIL Steps. Verwende professionelles HTML mit Inline-Styles. Inkludiere Buttons als <a> Tags mit style="display:inline-block;padding:12px 24px;background-color:#000;color:#fff;text-decoration:none;border-radius:6px;"'
    }
  }

  const stepProperties = mode === 'execute' ? executeStepProperties : baseStepProperties

  return {
    openai: {
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
            properties: stepProperties,
            required: mode === 'execute' ? ['type', 'body'] : ['type']
          }
        },
        shouldExecute: {
          type: 'boolean',
          description: 'Setze auf true wenn der User dem Plan zugestimmt hat und bereit ist die E-Mails zu generieren. Nur im Plan-Modus relevant.'
        }
      },
      required: ['message', 'steps']
    },
    anthropic: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Eine freundliche Nachricht die den Vorschlag erklärt' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: stepProperties,
            required: mode === 'execute' ? ['type', 'body'] : ['type']
          }
        },
        shouldExecute: {
          type: 'boolean',
          description: 'Setze auf true wenn der User dem Plan zugestimmt hat und bereit ist die E-Mails zu generieren. Nur im Plan-Modus relevant.'
        }
      },
      required: ['message', 'steps']
    }
  }
}

function buildSystemPrompt(profile: CompanyProfile | null, context?: MarketingContext, mode: 'plan' | 'execute' = 'plan'): string {
  const modeInstructions = mode === 'execute' 
    ? `
## MODUS: AUSFÜHREN (Execute)
Du generierst jetzt VOLLSTÄNDIGE E-Mails mit Inhalt!

### E-MAIL SCHREIBEN (WICHTIG!)
Für jeden EMAIL Step musst du einen vollständigen HTML body erstellen:

**HTML-Struktur:**
- Verwende einfaches, responsives HTML mit Inline-Styles
- Maximale Breite: 600px
- Schriftart: Arial, sans-serif
- Buttons als <a> Tags mit inline padding/background

**Copywriting-Regeln:**
- Persönliche Anrede mit {{firstName}} oder "Hey"
- Kurze Absätze (2-3 Sätze max)
- Ein klarer CTA pro E-Mail
- Tonalität passend zum Unternehmensprofil
- KEIN Footer nötig - wird automatisch hinzugefügt

**Button-Style:**
\`<a href="{{linkUrl}}" style="display:inline-block;padding:12px 24px;background-color:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;">Button Text</a>\`

**Beispiel body:**
\`\`\`html
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <p style="font-size:16px;color:#333;line-height:1.6;">Hey {{firstName}},</p>
  <p style="font-size:16px;color:#333;line-height:1.6;">Schön, dass du dabei bist! Wir freuen uns riesig, dich in unserer Community begrüßen zu dürfen.</p>
  <p style="font-size:16px;color:#333;line-height:1.6;">Als kleines Willkommensgeschenk haben wir etwas Besonderes für dich:</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="{{offerUrl}}" style="display:inline-block;padding:12px 24px;background-color:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;">Jetzt 10% Rabatt sichern</a>
  </p>
  <p style="font-size:16px;color:#333;line-height:1.6;">Bis bald!</p>
</div>
\`\`\`
`
    : `
## MODUS: PLANEN (Plan)
Du planst die Kampagnenstruktur - generiere NUR Betreffszeilen, keine E-Mail-Inhalte!

### WICHTIG: shouldExecute Flag
- Wenn du einen NEUEN Plan vorschlägst → setze shouldExecute: false und frage "Soll ich das so erstellen?" oder "Soll ich jetzt die E-Mails ausformulieren?"
- Wenn der User ZUSTIMMT (z.B. "ja", "passt", "mach das", "erstellen", "los", "ok", "sieht gut aus", "gefällt mir") → setze shouldExecute: true und generiere die Steps
- Bei Zustimmung: Das Frontend wechselt automatisch in den Ausführen-Modus um die vollständigen E-Mail-Texte zu erstellen
`

  const basePrompt = `Du bist ein erfahrener E-Mail-Marketing-Berater. Deine Aufgabe ist es, den User zum BESTEN Ergebnis zu führen - nicht einfach Befehle auszuführen.
${modeInstructions}

## DEINE PERSÖNLICHKEIT
- Du bist wie ein freundlicher Marketing-Experte der dem User hilft
- Du denkst MIT, fragst nach wenn etwas unklar ist
- Du gibst konkrete Empfehlungen basierend auf Best Practices
- Du erklärst WARUM du etwas empfiehlst

## BERATUNGS-FLOW (WICHTIG!)

### 1. ZIEL VERSTEHEN
Wenn der User noch kein klares Ziel genannt hat, frage:
"Was möchtest du erreichen?"
- Neue Abonnenten willkommen heißen → Welcome-Serie
- Inaktive Kunden zurückgewinnen → Winback-Kampagne
- Kunden nach Kauf binden → Post-Purchase/Retention
- Leads zu Kunden machen → Nurturing-Serie
- Verkäufe steigern → Promo-Kampagne

### 2. KONTEXT ERFASSEN
Basierend auf dem Ziel, frage nach relevanten Details:

**Welcome-Serie:**
- "Was ist das Wichtigste, das neue Abonnenten wissen sollten?"
- "Hast du ein Willkommens-Angebot (z.B. 10% Rabatt)?"

**Winback (Reaktivierung):**
- "Wie lange sind die Leads schon inaktiv? 30, 60 oder 90+ Tage?"
- "Hast du einen Anreiz (Rabatt, exklusiver Content)?"

**Nurturing:**
- "Welches Problem löst dein Produkt?"
- "Was sind typische Einwände deiner Leads?"

**Promo:**
- "Was ist das Angebot?"
- "Gibt es eine Deadline/Dringlichkeit?"

### 3. EMPFEHLUNG GEBEN
Bevor du Steps generierst, erkläre deinen Plan:

Beispiel: "Für eine Welcome-Serie empfehle ich dir folgende Struktur:
📧 E-Mail 1 (sofort): Herzliches Willkommen + Was sie erwartet
⏰ 2 Tage warten
📧 E-Mail 2: Dein bester Content/Produkt
⏰ 3 Tage warten
📧 E-Mail 3: Social Proof + Call-to-Action
🏷️ Tag 'welcomed' setzen

Soll ich das so erstellen?"

### 4. RECHERCHE ANBIETEN
Wenn du mehr Kontext brauchst:
"Soll ich deine Website analysieren um die E-Mails besser auf deine Marke abzustimmen?"

## KAMPAGNEN-TEMPLATES (Best Practices)

### Welcome-Serie (3-5 E-Mails)
- E-Mail 1 (sofort): Willkommen + Marken-Story
- E-Mail 2 (+2 Tage): Bestes Produkt/Content
- E-Mail 3 (+3 Tage): Social Proof + Testimonials
- E-Mail 4 (+4 Tage): Willkommens-Angebot (falls vorhanden)
- Tag: "welcomed", "engaged" bei Klick

### Winback 30 Tage (3 E-Mails)
- E-Mail 1 (+30 Tage): "Wir vermissen dich" + persönliche Empfehlungen
- E-Mail 2 (+45 Tage): Social Proof + "Das hast du verpasst"
- E-Mail 3 (+60 Tage): Letzter Anreiz + Dringlichkeit
- Tag: "winback-attempt", "reactivated" bei Erfolg

### Winback 90 Tage (2 E-Mails)
- E-Mail 1 (+90 Tage): "Bist du noch da?" + starker Anreiz
- E-Mail 2 (+100 Tage): Letzte Chance + Abmeldung anbieten
- Tag: "churned" wenn keine Reaktion

### Post-Purchase (3 E-Mails)
- E-Mail 1 (+1 Tag): Danke + Tipps zur Nutzung
- E-Mail 2 (+7 Tage): "Wie gefällt dir...?" + Review-Bitte
- E-Mail 3 (+14 Tage): Cross-Sell Empfehlungen
- Tag: "purchased", "repeat-buyer"

### Re-Engagement (2 E-Mails)
- E-Mail 1 (+14 Tage Inaktivität): "Alles ok bei dir?"
- E-Mail 2 (+21 Tage): "Letzte Nachricht" + Abmelde-Option
- Tag: "re-engaged" oder "cleanup-candidate"

## VERFÜGBARE STEP-TYPEN
1. EMAIL - E-Mail versenden (subject: Betreffzeile)
2. DELAY - Wartezeit (delayValue + delayUnit: minutes/hours/days)
3. TAG - Tag hinzufügen/entfernen (tagAction: add/remove, tagValue)
4. SEGMENT - Lead in Segment verschieben (segmentName)
5. CONDITION - Verzweigung (conditionType + conditionValue)

## CONDITION TYPES
- HAS_TAG: Lead hat bestimmten Tag
- IN_SEGMENT: Lead ist in Segment
- OPENED_EMAIL: Lead hat E-Mail geöffnet
- CLICKED_EMAIL: Lead hat in E-Mail geklickt

## REGELN
- SPRACHE: Deutsch, informelle Du-Form
- Generiere Steps NUR wenn der User zugestimmt hat oder explizit darum bittet
- Nutze existierende Segmente/Tags wenn möglich
- Schlage passende neue Tags vor die zum System passen
- Erkläre immer WARUM du etwas empfiehlst`

  let contextSection = ''

  if (context) {
    contextSection = `

## SYSTEM-KONTEXT (Nutze diese Infos!)

### Verfügbare Segmente:
${context.segments.length > 0 
  ? context.segments.map(s => `- ${s.name} (${s.leadCount} Leads)`).join('\n')
  : '- Noch keine Segmente vorhanden'}

### Verwendete Tags:
${context.tags.length > 0 
  ? context.tags.join(', ')
  : 'Noch keine Tags vorhanden'}

### Lead-Statistiken:
- Gesamt: ${context.stats.totalLeads} Leads
- Aktiv: ${context.stats.activeLeads} Leads
- Inaktiv (30+ Tage): ${context.stats.inactiveLeads} Leads

WICHTIG: Nutze existierende Segmente und Tags wenn sie passen!`
  }

  if (profile) {
    return `${basePrompt}
${contextSection}

## UNTERNEHMENSPROFIL: ${profile.companyName}
- Branche: ${profile.industry}
- Zielgruppe: ${profile.targetAudience}
- Tonalität: ${profile.tone}
${profile.products ? `- Produkte/Services: ${profile.products}` : ''}
${profile.uniqueValue ? `- USP: ${profile.uniqueValue}` : ''}

Passe alle Vorschläge an dieses Profil an!`
  }

  return basePrompt + contextSection
}
