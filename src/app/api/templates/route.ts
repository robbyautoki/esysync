import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// Vordefinierte Templates
const BUILTIN_TEMPLATES = [
  {
    id: 'welcome-simple',
    name: 'Willkommen (Einfach)',
    description: 'Kurze, persönliche Begrüßung',
    category: 'standard',
    isBuiltIn: true,
    subject: 'Willkommen, {{firstName}}!',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'willkommen an Bord! Schön, dass du dabei bist.' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Bei Fragen antworte einfach auf diese E-Mail.' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Beste Grüße' }] },
      ]
    }
  },
  {
    id: 'welcome-detailed',
    name: 'Willkommen (Ausführlich)',
    description: 'Detaillierte Begrüßung mit Features',
    category: 'standard',
    isBuiltIn: true,
    subject: 'Willkommen an Bord, {{firstName}}!',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'willkommen an Bord! Du hast einen wichtigen Schritt gemacht.' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ab jetzt bekommst du:' }] },
        { type: 'paragraph' },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Exklusive Tipps direkt in dein Postfach' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Frühen Zugang zu neuen Features' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Persönliche Unterstützung wenn du sie brauchst' }] }] },
          ]
        },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Der beste Start? Schau dir unsere kurze Einführung an:' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '→ Einführung ansehen', marks: [{ type: 'link', attrs: { href: '#' } }] }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Beste Grüße' }] },
      ]
    }
  },
  {
    id: 'followup',
    name: 'Nachfass-Email',
    description: 'Freundliche Nachfrage',
    category: 'standard',
    isBuiltIn: true,
    subject: 'Kurze Frage, {{firstName}}',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hi {{firstName}},' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'ich hoffe, du hattest einen guten Start.' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Mir ist aufgefallen, dass viele am Anfang ähnliche Fragen haben. Deshalb wollte ich kurz nachfragen:' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Gibt es etwas, wobei ich dir helfen kann?', marks: [{ type: 'bold' }] }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Antworte einfach auf diese Mail.' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Beste Grüße' }] },
      ]
    }
  },
  {
    id: 'newsletter-announcement',
    name: 'Newsletter Ankündigung',
    description: 'Neuigkeiten oder Produkt-Launch',
    category: 'marketing',
    isBuiltIn: true,
    subject: 'Neu: {{firstName}}, das musst du sehen!',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🚀 Große Neuigkeiten!' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'wir haben hart gearbeitet und freuen uns, dir heute etwas Besonderes zu zeigen.' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Was ist neu?' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '[Hier deine Ankündigung beschreiben]' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '→ Jetzt ansehen', marks: [{ type: 'link', attrs: { href: '#' } }, { type: 'bold' }] }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Beste Grüße' }] },
      ]
    }
  },
  {
    id: 'promo-offer',
    name: 'Sonderangebot',
    description: 'Rabatt oder zeitlich begrenztes Angebot',
    category: 'marketing',
    isBuiltIn: true,
    subject: '{{firstName}}, nur heute: Exklusives Angebot',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🎁 Exklusiv für dich' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'als Dankeschön für deine Treue haben wir ein besonderes Angebot für dich:' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '[XX]% Rabatt' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Gültig nur bis [Datum].' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: '→ Angebot sichern', marks: [{ type: 'link', attrs: { href: '#' } }, { type: 'bold' }] }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Beste Grüße' }] },
      ]
    }
  },
  {
    id: 'thank-you',
    name: 'Danke',
    description: 'Bedanken nach Kauf oder Aktion',
    category: 'transactional',
    isBuiltIn: true,
    subject: 'Danke, {{firstName}}! 🙏',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'vielen Dank für dein Vertrauen!' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Es bedeutet mir wirklich viel, dass du dabei bist.' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Falls du Fragen hast oder Hilfe brauchst – ich bin nur eine Antwort entfernt.' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Herzliche Grüße' }] },
      ]
    }
  },
]

// GET - Alle Templates abrufen
export async function GET() {
  try {
    // Hole Custom-Templates aus DB
    const customTemplates = await db.emailTemplate.findMany({
      where: { isBuiltIn: false },
      orderBy: { createdAt: 'desc' }
    })

    // Kombiniere mit Built-in Templates
    const allTemplates = [
      ...BUILTIN_TEMPLATES,
      ...customTemplates
    ]

    // Gruppiere nach Kategorie
    const grouped = {
      standard: allTemplates.filter(t => t.category === 'standard'),
      marketing: allTemplates.filter(t => t.category === 'marketing'),
      transactional: allTemplates.filter(t => t.category === 'transactional'),
      custom: customTemplates
    }

    return NextResponse.json({
      templates: allTemplates,
      grouped
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Templates konnten nicht geladen werden' },
      { status: 500 }
    )
  }
}

// POST - Neues Custom-Template erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const template = await db.emailTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category || 'custom',
        content: body.content,
        subject: body.subject,
        isBuiltIn: false
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Template konnte nicht erstellt werden' },
      { status: 500 }
    )
  }
}
