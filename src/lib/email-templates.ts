export interface EmailTemplate {
  id: string
  name: string
  description: string
  subject: string
  content: any // TipTap JSON with HTML
}

// Helper to create styled HTML block
const createStyledTemplate = (bodyHtml: string) => ({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: bodyHtml
        }
      ]
    }
  ]
})

// Resend-style button HTML
const button = (text: string, href = '#') => 
  `<a href="${href}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">${text}</a>`

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Willkommen',
    description: 'Begrüßung für neue Kontakte',
    subject: 'Willkommen, {{firstName}}!',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'schön, dass du dabei bist.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Wir freuen uns darauf, dich auf deinem Weg zu begleiten. Bei Fragen sind wir jederzeit für dich da.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [
            { 
              type: 'text', 
              marks: [{ type: 'link', attrs: { href: '#', target: '_blank' } }],
              text: '→ Jetzt starten'
            }
          ] 
        },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Bis bald' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [
            { 
              type: 'text', 
              marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
              text: 'Abmelden'
            }
          ] 
        }
      ]
    }
  },
  {
    id: 'followup',
    name: 'Follow-up',
    description: 'Nachfassen nach erstem Kontakt',
    subject: 'Kurz nachgefragt, {{firstName}}',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hi {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'ich wollte mich kurz melden und fragen, ob du Fragen hast.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Falls du Unterstützung brauchst oder einen Termin vereinbaren möchtest – ich bin gerne für dich da.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [
            { 
              type: 'text', 
              marks: [{ type: 'link', attrs: { href: '#', target: '_blank' } }],
              text: '→ Termin buchen'
            }
          ] 
        },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Beste Grüße' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [
            { 
              type: 'text', 
              marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
              text: 'Abmelden'
            }
          ] 
        }
      ]
    }
  },
  {
    id: 'offer',
    name: 'Angebot',
    description: 'Produkt oder Service vorstellen',
    subject: 'Etwas für dich, {{firstName}}',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'ich habe etwas, das dich interessieren könnte.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '[Hier dein Angebot beschreiben]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Klingt interessant?' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [
            { 
              type: 'text', 
              marks: [{ type: 'link', attrs: { href: '#', target: '_blank' } }],
              text: '→ Mehr erfahren'
            }
          ] 
        },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Viele Grüße' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [
            { 
              type: 'text', 
              marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
              text: 'Abmelden'
            }
          ] 
        }
      ]
    }
  },
  {
    id: 'reminder',
    name: 'Erinnerung',
    description: 'Freundliche Erinnerung',
    subject: 'Kleine Erinnerung, {{firstName}}',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hi {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'nur eine kurze Erinnerung.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Hier deine Erinnerung einfügen]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Bei Fragen melde dich gerne.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [
            { 
              type: 'text', 
              marks: [{ type: 'link', attrs: { href: '#', target: '_blank' } }],
              text: '→ Jetzt ansehen'
            }
          ] 
        },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Liebe Grüße' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [
            { 
              type: 'text', 
              marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
              text: 'Abmelden'
            }
          ] 
        }
      ]
    }
  },
  {
    id: 'thankyou',
    name: 'Danke',
    description: 'Dankeschön-Nachricht',
    subject: 'Danke, {{firstName}}!',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'ich wollte mich einfach mal bedanken.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Hier den Grund für den Dank einfügen]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Es bedeutet mir viel.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Herzliche Grüße' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [
            { 
              type: 'text', 
              marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
              text: 'Abmelden'
            }
          ] 
        }
      ]
    }
  }
]
