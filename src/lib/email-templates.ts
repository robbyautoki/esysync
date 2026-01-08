export interface EmailTemplate {
  id: string
  name: string
  description: string
  subject: string
  content: any
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Willkommen',
    description: 'Begrüßung für neue Kontakte',
    subject: 'Willkommen an Bord, {{firstName}}',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'willkommen an Bord!' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Du hast einen wichtigen Schritt gemacht. Ab jetzt bekommst du:' }] },
        { type: 'paragraph', content: [] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Exklusive Tipps direkt in dein Postfach' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Frühen Zugang zu neuen Features' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Persönliche Unterstützung wenn du sie brauchst' }] }] }
        ]},
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Der beste Start? Schau dir unsere kurze Einführung an:' }] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '#', target: '_blank' } }],
            text: '→ Einführung ansehen'
          }] 
        },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Bei Fragen – einfach auf diese Mail antworten.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Bis bald' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
            text: 'Abmelden'
          }] 
        }
      ]
    }
  },
  {
    id: 'followup',
    name: 'Follow-up',
    description: 'Nachfassen nach erstem Kontakt',
    subject: 'Kurze Frage, {{firstName}}',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hi {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'ich hoffe, du hattest einen guten Start.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Mir ist aufgefallen, dass viele am Anfang ähnliche Fragen haben. Deshalb wollte ich kurz nachfragen:' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Gibt es etwas, wobei ich dir helfen kann?' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ob technische Frage, strategische Überlegung oder einfach mal Brainstormen – ich nehme mir gerne Zeit für dich.' }] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '#', target: '_blank' } }],
            text: '→ Termin vereinbaren'
          }] 
        },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Oder antworte einfach auf diese Mail.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Beste Grüße' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
            text: 'Abmelden'
          }] 
        }
      ]
    }
  },
  {
    id: 'offer',
    name: 'Angebot',
    description: 'Produkt oder Service vorstellen',
    subject: '{{firstName}}, das könnte dir helfen',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'kennst du das? Du steckst Zeit und Energie in etwas, aber die Ergebnisse bleiben aus.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Genau dafür habe ich etwas entwickelt:' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '[Produktname]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Was du davon hast:' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[Vorteil 1 – konkretes Ergebnis]' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[Vorteil 2 – Zeit/Geld gespart]' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[Vorteil 3 – einfache Umsetzung]' }] }] }
        ]},
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Das Beste: Du kannst es risikofrei testen.' }] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '#', target: '_blank' } }],
            text: '→ Mehr erfahren'
          }] 
        },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Hast du Fragen? Schreib mir einfach.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Viele Grüße' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
            text: 'Abmelden'
          }] 
        }
      ]
    }
  },
  {
    id: 'reminder',
    name: 'Erinnerung',
    description: 'Freundliche Erinnerung',
    subject: 'Nicht vergessen, {{firstName}}',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hi {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'kurze Erinnerung von mir.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Hier deine Erinnerung – z.B. Webinar morgen, Angebot endet, Feedback gewünscht]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Deadline: [Datum/Uhrzeit einfügen]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ich weiß, der Alltag ist voll. Deshalb dieser kleine Reminder.' }] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '#', target: '_blank' } }],
            text: '→ Jetzt sichern'
          }] 
        },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Falls du Hilfe brauchst – ich bin da.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Liebe Grüße' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
            text: 'Abmelden'
          }] 
        }
      ]
    }
  },
  {
    id: 'thankyou',
    name: 'Danke',
    description: 'Dankeschön-Nachricht',
    subject: 'Danke, {{firstName}} 🙏',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hallo {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'ich wollte einfach mal Danke sagen.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Für deinen Kauf / dein Feedback / deine Treue / dass du dabei bist]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Es ist nicht selbstverständlich und ich weiß das zu schätzen.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Als kleines Dankeschön habe ich etwas für dich:' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '[Bonus / Rabattcode / exklusiver Inhalt]' }] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '#', target: '_blank' } }],
            text: '→ Geschenk abholen'
          }] 
        },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Wenn du Fragen hast oder einfach Hallo sagen willst – schreib mir.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Herzliche Grüße' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
            text: 'Abmelden'
          }] 
        }
      ]
    }
  },
  {
    id: 'value',
    name: 'Mehrwert',
    description: 'Nützlicher Tipp oder Inhalt',
    subject: '{{firstName}}, ein Tipp der funktioniert',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hi {{firstName}},' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'heute habe ich einen Tipp für dich, der mir persönlich viel gebracht hat.' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '[Tipp-Überschrift]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Erkläre das Problem kurz]' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Die Lösung ist einfacher als gedacht:' }] },
        { type: 'paragraph', content: [] },
        { type: 'orderedList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[Schritt 1]' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[Schritt 2]' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[Schritt 3]' }] }] }
        ]},
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Probier es aus und sag mir, wie es läuft.' }] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '#', target: '_blank' } }],
            text: '→ Ausführliche Anleitung'
          }] 
        },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Viel Erfolg!' }] },
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
        { 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            marks: [{ type: 'link', attrs: { href: '{{unsubscribe_link}}', target: '_blank' } }],
            text: 'Abmelden'
          }] 
        }
      ]
    }
  }
]
