import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  description: z.string().min(5, 'Beschreibung zu kurz'),
  sequenceId: z.string()
})

interface GeneratedStep {
  type: 'EMAIL' | 'DELAY'
  subject?: string
  delayDays?: number
}

export async function POST(request: NextRequest) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API Key nicht konfiguriert' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { description } = requestSchema.parse(body)

    const systemPrompt = `Du bist ein E-Mail-Marketing-Experte. Generiere eine Sequenz von E-Mail-Steps basierend auf der Beschreibung.

WICHTIG:
- Jede E-Mail MUSS von einem Delay gefolgt werden (außer die letzte)
- Delays werden in TAGEN angegeben
- Generiere NUR die Struktur, KEINEN E-Mail-Inhalt
- Betreffzeilen sollen aussagekräftig aber kurz sein
- Typische Sequenz: 3-5 E-Mails über 1-3 Wochen

Antworte mit einem JSON-Objekt mit "steps" Array in diesem Format:
{
  "steps": [
    { "type": "EMAIL", "subject": "Willkommen bei unserem Service" },
    { "type": "DELAY", "delayDays": 3 },
    { "type": "EMAIL", "subject": "Erste Schritte" },
    { "type": "DELAY", "delayDays": 5 },
    { "type": "EMAIL", "subject": "Haben Sie Fragen?" }
  ]
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      throw new Error('OpenAI API Fehler')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('Keine Antwort von OpenAI')
    }

    // Parse JSON response
    let parsed: { steps?: GeneratedStep[] }
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new Error('Ungültiges JSON von OpenAI')
    }

    const steps = parsed.steps || []
    if (steps.length === 0) {
      throw new Error('Keine Steps generiert')
    }

    // Validiere und formatiere Steps
    const formattedSteps = steps.map((step: GeneratedStep, index: number) => {
      if (step.type === 'EMAIL') {
        return {
          id: `temp-${Date.now()}-${index}`,
          type: 'EMAIL' as const,
          order: index,
          subject: step.subject || `E-Mail ${index + 1}`,
          content: { type: 'doc', content: [] },
          delayValue: null,
          delayUnit: null
        }
      } else {
        return {
          id: `temp-${Date.now()}-${index}`,
          type: 'DELAY' as const,
          order: index,
          subject: null,
          content: null,
          delayValue: step.delayDays || 1,
          delayUnit: 'days'
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      steps: formattedSteps 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error generating steps:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Generieren der Steps' },
      { status: 500 }
    )
  }
}
