import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface GenerateEmailRequest {
  instruction: string
  prompt: string
  variables?: string[]
  existingContent?: any
  existingSubject?: string
  mode: 'new' | 'continue'
}

const TIPTAP_SCHEMA = `
TIPTAP JSON SCHEMA - Generiere valides TipTap JSON:

BLOCK NODES (auf oberster Ebene in content[]):
- paragraph: { "type": "paragraph", "content": [text nodes] }
- heading: { "type": "heading", "attrs": { "level": 1 }, "content": [text nodes] }
- bulletList: { "type": "bulletList", "content": [listItem nodes] }
- orderedList: { "type": "orderedList", "content": [listItem nodes] }
- listItem: { "type": "listItem", "content": [paragraph] }
- blockquote: { "type": "blockquote", "content": [paragraph nodes] }
- ctaButton: { "type": "ctaButton", "attrs": { "text": "Button Text", "href": "https://...", "color": "#000000" } }
  Button-Farben: "#000000" (schwarz), "#2563eb" (blau), "#16a34a" (grün)
- spacer: { "type": "spacer", "attrs": { "size": "small" | "medium" | "large" } }
  Größen: "small" (16px), "medium" (32px), "large" (48px)
- horizontalRule: { "type": "horizontalRule" }

TEXT NODES (innerhalb von paragraph/heading content[]):
- text: { "type": "text", "text": "Der Text", "marks": [...] }

MARKS (optional auf text nodes):
- bold: { "type": "bold" }
- italic: { "type": "italic" }
- link: { "type": "link", "attrs": { "href": "https://..." } }
- textStyle: { "type": "textStyle", "attrs": { "color": "#ef4444" } }
  Farben: "#ef4444" (rot), "#22c55e" (grün), "#3b82f6" (blau), "#8b5cf6" (lila)
- highlight: { "type": "highlight", "attrs": { "color": "#fef08a" } }
  Farben: "#fef08a" (gelb), "#bbf7d0" (grün), "#bfdbfe" (blau), "#fbcfe8" (pink)

BEISPIEL - E-Mail mit Button:
{
  "subject": "Dein Newsletter ist da!",
  "content": {
    "type": "doc",
    "content": [
      { "type": "paragraph", "content": [{ "type": "text", "text": "Hallo {{firstName}}," }] },
      { "type": "paragraph", "content": [{ "type": "text", "text": "Hier ist dein wöchentliches Update." }] },
      { "type": "spacer", "attrs": { "size": "medium" } },
      { "type": "ctaButton", "attrs": { "text": "Mehr erfahren", "href": "https://example.com", "color": "#2563eb" } }
    ]
  }
}
`

export async function POST(request: NextRequest) {
  try {
    const { 
      instruction, 
      prompt, 
      variables = ['firstName', 'email'],
      existingContent,
      existingSubject,
      mode = 'new'
    } = await request.json() as GenerateEmailRequest
    
    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'Bitte beschreibe, was die E-Mail machen soll' },
        { status: 400 }
      )
    }
    
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API Key nicht konfiguriert' },
        { status: 500 }
      )
    }
    
    const variablesList = variables.map(v => `{{${v}}}`).join(', ')
    
    let systemPrompt: string
    let userPrompt: string
    
    if (mode === 'continue' && existingContent) {
      systemPrompt = `Du bist ein E-Mail-Editor-Assistent. Du bearbeitest bestehende E-Mails basierend auf Anweisungen.

${TIPTAP_SCHEMA}

REGELN:
1. Behalte den bestehenden Content und modifiziere nur was der User anfragt
2. Verwende diese Variablen wo sinnvoll: ${variablesList}
3. Kein Footer/Abmeldelink - wird automatisch hinzugefügt
4. Wenn User "Button hinzufügen" sagt, füge einen ctaButton Node hinzu
5. Wenn User "Trennlinie" sagt, füge horizontalRule hinzu
6. Wenn User "Abstand" sagt, füge spacer hinzu
7. Für Zitate nutze blockquote

STIL: ${instruction || 'Freundlich und persönlich'}

Gib NUR valides JSON zurück: { "subject": "...", "content": { "type": "doc", "content": [...] } }`

      userPrompt = `BESTEHENDE E-MAIL:
Betreff: ${existingSubject || '(kein Betreff)'}
Content: ${JSON.stringify(existingContent)}

ANWEISUNG: ${prompt}

Gib die modifizierte E-Mail als JSON zurück.`
    } else {
      systemPrompt = `Du bist ein E-Mail-Marketing-Experte. Du generierst E-Mails als TipTap JSON.

${TIPTAP_SCHEMA}

REGELN:
1. Verwende Variablen: ${variablesList}
2. Beginne mit "Hallo {{firstName}}," oder ähnlich
3. Kein Footer/Abmeldelink - wird automatisch hinzugefügt
4. 100-300 Wörter
5. Vermeide Spam-Wörter (GRATIS, KOSTENLOS, JETZT KAUFEN)
6. Nutze ctaButton für Call-to-Actions statt Links im Text
7. Nutze spacer für visuelle Trennung vor Buttons
8. Nutze blockquote für Zitate/Testimonials

STIL: ${instruction || 'Freundlich und persönlich'}

Gib NUR valides JSON zurück: { "subject": "...", "content": { "type": "doc", "content": [...] } }`

      userPrompt = `Erstelle eine E-Mail für: ${prompt}`
    }

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
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return NextResponse.json(
        { error: 'Fehler bei der KI-Generierung' },
        { status: 500 }
      )
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    
    try {
      const parsed = JSON.parse(content)
      
      if (!parsed.subject || !parsed.content) {
        throw new Error('Missing subject or content')
      }
      
      return NextResponse.json({
        subject: parsed.subject,
        content: parsed.content
      })
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content)
      return NextResponse.json(
        { error: 'Ungültige KI-Antwort' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Generate email error:', error)
    return NextResponse.json(
      { error: 'E-Mail-Generierung fehlgeschlagen' },
      { status: 500 }
    )
  }
}
