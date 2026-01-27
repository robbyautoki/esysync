import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface GenerateEmailRequest {
  instruction: string
  prompt: string
  variables?: string[]
}

interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  attrs?: Record<string, unknown>
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export async function POST(request: NextRequest) {
  try {
    const { instruction, prompt, variables = ['firstName', 'email'] } = await request.json() as GenerateEmailRequest
    
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
    
    const systemPrompt = `Du bist ein E-Mail-Marketing-Experte. Schreibe Marketing-E-Mails auf Deutsch.

WICHTIGE REGELN:
1. Verwende diese Variablen wo sinnvoll: ${variablesList}
2. Beginne IMMER mit "Hallo {{firstName}}," oder ähnlich
3. Schreibe keinen Footer/Abmeldelink - der wird automatisch hinzugefügt
4. Halte die E-Mail zwischen 100-300 Wörtern
5. Vermeide Spam-Wörter wie GRATIS, KOSTENLOS, JETZT KAUFEN
6. Der Betreff sollte neugierig machen aber nicht clickbaity sein

STIL-ANWEISUNG:
${instruction || 'Schreibe in einem freundlichen, persönlichen Ton.'}

AUSGABE-FORMAT (WICHTIG - halte dich exakt daran):
Gib NUR ein JSON-Objekt zurück, keine Erklärungen davor oder danach:
{
  "subject": "Der Betreff hier",
  "body": "Der E-Mail-Text hier mit Absätzen getrennt durch \\n\\n"
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
          { role: 'user', content: `Schreibe eine E-Mail für: ${prompt}` }
        ],
        max_tokens: 1000,
        temperature: 0.7
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
    const content = data.choices?.[0]?.message?.content || ''
    
    // Parse JSON response
    let parsed: { subject: string; body: string }
    try {
      // Entferne mögliche Markdown-Codeblöcke
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsed = JSON.parse(cleanContent)
    } catch {
      console.error('Failed to parse OpenAI response:', content)
      return NextResponse.json(
        { error: 'Ungültige KI-Antwort' },
        { status: 500 }
      )
    }
    
    // Konvertiere Text zu TipTap JSON
    const tiptapContent = textToTiptap(parsed.body)
    
    return NextResponse.json({
      subject: parsed.subject,
      content: tiptapContent
    })
    
  } catch (error) {
    console.error('Generate email error:', error)
    return NextResponse.json(
      { error: 'E-Mail-Generierung fehlgeschlagen' },
      { status: 500 }
    )
  }
}

function textToTiptap(text: string): TiptapNode {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
  
  const content: TiptapNode[] = paragraphs.map(para => {
    const trimmed = para.trim()
    
    // Check if it's a bullet list
    if (trimmed.includes('\n- ') || trimmed.startsWith('- ')) {
      const items = trimmed.split('\n').filter(line => line.startsWith('- '))
      return {
        type: 'bulletList',
        content: items.map(item => ({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineContent(item.replace(/^- /, ''))
          }]
        }))
      }
    }
    
    // Check if it's a CTA link (starts with →)
    if (trimmed.startsWith('→')) {
      const linkText = trimmed.replace(/^→\s*/, '')
      return {
        type: 'paragraph',
        content: [{
          type: 'text',
          text: `→ ${linkText}`,
          marks: [{ type: 'link', attrs: { href: '#' } }]
        }]
      }
    }
    
    // Regular paragraph
    return {
      type: 'paragraph',
      content: parseInlineContent(trimmed)
    }
  })
  
  return {
    type: 'doc',
    content
  }
}

function parseInlineContent(text: string): TiptapNode[] {
  // Simple parsing - just return text nodes
  // Could be extended to handle **bold** and *italic* etc.
  if (!text) return []
  
  const nodes: TiptapNode[] = []
  
  // Handle bold text marked with **
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push({
        type: 'text',
        text: part.slice(2, -2),
        marks: [{ type: 'bold' }]
      })
    } else if (part) {
      nodes.push({
        type: 'text',
        text: part
      })
    }
  }
  
  return nodes.length > 0 ? nodes : [{ type: 'text', text: text }]
}
