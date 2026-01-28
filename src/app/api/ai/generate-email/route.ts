import { NextRequest, NextResponse } from 'next/server'
import { executeActions, EditorAction, TiptapContent } from '@/lib/editor-functions'

export const dynamic = 'force-dynamic'

interface GenerateEmailRequest {
  instruction: string
  prompt: string
  variables?: string[]
  existingContent?: any
  existingSubject?: string
  mode: 'new' | 'edit'
  stream?: boolean
}

// OpenAI Function Definitions für Edit-Modus
const EDIT_FUNCTIONS = [
  {
    name: 'modifyButton',
    description: 'Ändert einen bestehenden Button (Farbe, Text oder URL)',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Buttons (0-basiert), oder -1 für ersten Button' },
        text: { type: 'string', description: 'Neuer Button-Text (optional)' },
        url: { type: 'string', description: 'Neue Button-URL (optional)' },
        color: { type: 'string', description: 'Neue Button-Farbe als Hex (#000000=schwarz, #2563eb=blau, #16a34a=grün)' }
      },
      required: ['position']
    }
  },
  {
    name: 'insertButton',
    description: 'Fügt einen neuen CTA-Button ein',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position zum Einfügen (0=Anfang, -1=Ende)' },
        text: { type: 'string', description: 'Button-Text' },
        url: { type: 'string', description: 'Button-URL' },
        color: { type: 'string', description: 'Button-Farbe (#000000, #2563eb, #16a34a)', default: '#000000' }
      },
      required: ['position', 'text', 'url']
    }
  },
  {
    name: 'deleteButton',
    description: 'Entfernt einen Button',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Buttons' }
      },
      required: ['position']
    }
  },
  {
    name: 'insertSpacer',
    description: 'Fügt einen vertikalen Abstand ein',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position zum Einfügen' },
        size: { type: 'string', enum: ['small', 'medium', 'large'], description: 'Größe: small=16px, medium=32px, large=48px' }
      },
      required: ['position', 'size']
    }
  },
  {
    name: 'modifySpacer',
    description: 'Ändert die Größe eines Spacers',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Spacers' },
        size: { type: 'string', enum: ['small', 'medium', 'large'] }
      },
      required: ['position', 'size']
    }
  },
  {
    name: 'deleteSpacer',
    description: 'Entfernt einen Spacer',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Spacers' }
      },
      required: ['position']
    }
  },
  {
    name: 'insertDivider',
    description: 'Fügt eine horizontale Trennlinie ein',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position zum Einfügen' }
      },
      required: ['position']
    }
  },
  {
    name: 'deleteDivider',
    description: 'Entfernt eine Trennlinie',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position der Trennlinie' }
      },
      required: ['position']
    }
  },
  {
    name: 'setTextColor',
    description: 'Ändert die Textfarbe eines Absatzes/Überschrift',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Absatzes' },
        color: { type: 'string', description: 'Farbe als Hex (#ef4444=rot, #22c55e=grün, #3b82f6=blau)' }
      },
      required: ['position', 'color']
    }
  },
  {
    name: 'setTextHighlight',
    description: 'Markiert Text mit einer Hintergrundfarbe',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Absatzes' },
        color: { type: 'string', description: 'Highlight-Farbe (#fef08a=gelb, #bbf7d0=grün, #bfdbfe=blau, #fbcfe8=pink)' }
      },
      required: ['position', 'color']
    }
  },
  {
    name: 'setTextBold',
    description: 'Macht Text fett oder entfernt Fettschrift',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Absatzes' },
        bold: { type: 'boolean', description: 'true=fett, false=normal' }
      },
      required: ['position', 'bold']
    }
  },
  {
    name: 'insertParagraph',
    description: 'Fügt einen neuen Textabsatz ein',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position zum Einfügen' },
        text: { type: 'string', description: 'Der Text' }
      },
      required: ['position', 'text']
    }
  },
  {
    name: 'modifyParagraph',
    description: 'Ändert den Text eines Absatzes',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Absatzes' },
        text: { type: 'string', description: 'Neuer Text' }
      },
      required: ['position', 'text']
    }
  },
  {
    name: 'deleteParagraph',
    description: 'Löscht einen Absatz',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Absatzes' }
      },
      required: ['position']
    }
  },
  {
    name: 'insertHeading',
    description: 'Fügt eine Überschrift ein',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position zum Einfügen' },
        level: { type: 'number', enum: [1, 2], description: '1=H1, 2=H2' },
        text: { type: 'string', description: 'Überschrift-Text' }
      },
      required: ['position', 'level', 'text']
    }
  },
  {
    name: 'insertBlockquote',
    description: 'Fügt ein Zitat/Blockquote ein',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position zum Einfügen' },
        text: { type: 'string', description: 'Zitat-Text' }
      },
      required: ['position', 'text']
    }
  },
  {
    name: 'deleteBlockquote',
    description: 'Entfernt ein Zitat',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Zitats' }
      },
      required: ['position']
    }
  },
  {
    name: 'insertBulletList',
    description: 'Fügt eine Aufzählungsliste ein',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position zum Einfügen' },
        items: { type: 'array', items: { type: 'string' }, description: 'Liste der Punkte' }
      },
      required: ['position', 'items']
    }
  },
  {
    name: 'moveNode',
    description: 'Verschiebt ein Element an eine andere Position',
    parameters: {
      type: 'object',
      properties: {
        fromPosition: { type: 'number', description: 'Aktuelle Position' },
        toPosition: { type: 'number', description: 'Neue Position' }
      },
      required: ['fromPosition', 'toPosition']
    }
  },
  {
    name: 'deleteNode',
    description: 'Löscht ein Element an einer Position',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Position des Elements' }
      },
      required: ['position']
    }
  },
  {
    name: 'changeSubject',
    description: 'Ändert den E-Mail-Betreff',
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Neuer Betreff' }
      },
      required: ['subject']
    }
  }
]

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
      mode = 'new',
      stream = false
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
    
    // EDIT MODE: Use Function Calling for precise modifications
    if (mode === 'edit' && existingContent) {
      const contentDescription = describeContent(existingContent)
      
      const editSystemPrompt = `Du bist ein E-Mail-Editor-Assistent. Analysiere die Anweisung und rufe die passenden Funktionen auf.

AKTUELLER E-MAIL-INHALT:
${contentDescription}

REGELN:
- Rufe NUR die Funktionen auf, die für die Anweisung nötig sind
- Ändere NICHTS, was nicht explizit angefragt wurde
- Position 0 = erstes Element, Position -1 = am Ende einfügen
- Für Buttons: #000000=schwarz, #2563eb=blau, #16a34a=grün
- Für Text: #ef4444=rot, #22c55e=grün, #3b82f6=blau
- Für Highlights: #fef08a=gelb, #bbf7d0=grün, #bfdbfe=blau`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: editSystemPrompt },
            { role: 'user', content: prompt }
          ],
          tools: EDIT_FUNCTIONS.map(f => ({ type: 'function', function: f })),
          tool_choice: 'auto',
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('OpenAI API error:', error)
        return NextResponse.json({ error: 'Fehler bei der KI-Generierung' }, { status: 500 })
      }

      const data = await response.json()
      const message = data.choices?.[0]?.message

      // Process function calls
      const toolCalls = message?.tool_calls || []
      
      if (toolCalls.length === 0) {
        // No function calls - AI couldn't understand the request
        return NextResponse.json({
          error: 'Die Anweisung konnte nicht verstanden werden. Bitte sei spezifischer.'
        }, { status: 400 })
      }

      // Convert tool calls to actions
      const actions: EditorAction[] = []
      let newSubject = existingSubject || ''

      for (const call of toolCalls) {
        const args = JSON.parse(call.function.arguments)
        
        // Handle changeSubject separately
        if (call.function.name === 'changeSubject') {
          newSubject = args.subject
          continue
        }
        
        // Handle position -1 (end)
        if (args.position === -1) {
          args.position = existingContent.content?.length || 0
        }
        
        actions.push({
          function: call.function.name,
          args
        })
      }

      // Execute actions on content
      let newContent = existingContent as TiptapContent
      if (actions.length > 0) {
        newContent = executeActions(existingContent, actions)
      }

      return NextResponse.json({
        subject: newSubject,
        content: newContent,
        actions // Include actions for debugging/display
      })
    }

    // NEW MODE: Generate complete email with json-render format
    const jsonRenderSchema = `
VERFÜGBARE KOMPONENTEN (json-render Format):

1. Paragraph - Textabsatz
   { "key": "eindeutig", "type": "Paragraph", "props": { "text": "..." } }
   
2. Heading - Überschrift
   { "key": "eindeutig", "type": "Heading", "props": { "level": "1"|"2", "text": "..." } }
   
3. Button - CTA Button
   { "key": "eindeutig", "type": "Button", "props": { "text": "...", "href": "https://...", "color": "black"|"blue"|"green" } }
   
4. Spacer - Vertikaler Abstand
   { "key": "eindeutig", "type": "Spacer", "props": { "size": "small"|"medium"|"large" } }
   
5. Divider - Horizontale Trennlinie
   { "key": "eindeutig", "type": "Divider", "props": {} }
   
6. Blockquote - Zitat
   { "key": "eindeutig", "type": "Blockquote", "props": { "text": "..." } }
   
7. BulletList - Aufzählungsliste
   { "key": "eindeutig", "type": "BulletList", "props": { "items": ["Punkt 1", "Punkt 2"] } }

AUSGABE-FORMAT:
{
  "subject": "E-Mail Betreff",
  "elements": [
    { "key": "greeting", "type": "Paragraph", "props": { "text": "Hallo {{firstName}}," } },
    ...weitere Elemente
  ]
}
`

    const systemPrompt = `Du bist ein E-Mail-Marketing-Experte. Du generierst E-Mails im json-render Format.

${jsonRenderSchema}

REGELN:
1. Verwende Variablen: ${variablesList}
2. Beginne mit "Hallo {{firstName}}," oder ähnlich
3. Kein Footer/Abmeldelink - wird automatisch hinzugefügt
4. 100-300 Wörter
5. Vermeide Spam-Wörter (GRATIS, KOSTENLOS, JETZT KAUFEN)
6. Nutze Button für Call-to-Actions
7. Nutze Spacer vor Buttons für bessere Optik
8. Jedes Element braucht einen eindeutigen "key"

STIL: ${instruction || 'Freundlich und persönlich'}

Gib NUR valides JSON zurück mit subject und elements Array.`

    const userPrompt = `Erstelle eine E-Mail für: ${prompt}`

    // STREAMING MODE
    if (stream) {
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
          stream: true
        })
      })

      if (!response.ok) {
        return NextResponse.json({ error: 'Fehler bei der KI-Generierung' }, { status: 500 })
      }

      // Stream the response
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          const decoder = new TextDecoder()
          let buffer = ''

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') continue
                  
                  try {
                    const parsed = JSON.parse(data)
                    const content = parsed.choices?.[0]?.delta?.content
                    if (content) {
                      controller.enqueue(encoder.encode(content))
                    }
                  } catch {}
                }
              }
            }
          } finally {
            controller.close()
          }
        }
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache'
        }
      })
    }

    // NON-STREAMING MODE (fallback)
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
      
      if (!parsed.subject || !parsed.elements) {
        throw new Error('Missing subject or elements')
      }
      
      return NextResponse.json({
        subject: parsed.subject,
        elements: parsed.elements,
        format: 'json-render'
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

// Hilfsfunktion: Content für AI beschreiben
function describeContent(content: any): string {
  if (!content?.content) return 'Leer'
  
  return content.content.map((node: any, index: number) => {
    switch (node.type) {
      case 'paragraph':
        const pText = node.content?.map((c: any) => c.text || '').join('') || ''
        return `[${index}] Absatz: "${pText.slice(0, 50)}${pText.length > 50 ? '...' : ''}"`
      case 'heading':
        const hText = node.content?.map((c: any) => c.text || '').join('') || ''
        return `[${index}] Überschrift H${node.attrs?.level || 1}: "${hText}"`
      case 'ctaButton':
        return `[${index}] Button: "${node.attrs?.text}" (Farbe: ${node.attrs?.color}, URL: ${node.attrs?.href})`
      case 'spacer':
        return `[${index}] Spacer: ${node.attrs?.size}`
      case 'horizontalRule':
        return `[${index}] Trennlinie`
      case 'blockquote':
        const bqText = node.content?.[0]?.content?.map((c: any) => c.text || '').join('') || ''
        return `[${index}] Zitat: "${bqText.slice(0, 50)}..."`
      case 'bulletList':
        return `[${index}] Aufzählung (${node.content?.length || 0} Punkte)`
      case 'orderedList':
        return `[${index}] Nummerierte Liste (${node.content?.length || 0} Punkte)`
      default:
        return `[${index}] ${node.type}`
    }
  }).join('\n')
}
