// Email Component Catalog für AI E-Mail Generierung
// Definiert welche Komponenten die AI generieren darf

// Element-Typen für TypeScript
export interface EmailElement {
  key: string
  type: 'Paragraph' | 'Heading' | 'Button' | 'Spacer' | 'Divider' | 'Blockquote' | 'BulletList' | 'Image'
  props: Record<string, any>
}

export interface EmailDocument {
  subject: string
  elements: EmailElement[]
}

// Schema als String für AI System Prompt
export const EMAIL_CATALOG_SCHEMA = `
VERFÜGBARE KOMPONENTEN (json-render Format):

1. Paragraph - Textabsatz
   { "type": "Paragraph", "props": { "text": "..." } }
   
2. Heading - Überschrift
   { "type": "Heading", "props": { "level": "1"|"2", "text": "..." } }
   
3. Button - CTA Button
   { "type": "Button", "props": { "text": "...", "href": "https://...", "color": "black"|"blue"|"green" } }
   
4. Spacer - Vertikaler Abstand
   { "type": "Spacer", "props": { "size": "small"|"medium"|"large" } }
   
5. Divider - Horizontale Trennlinie
   { "type": "Divider", "props": {} }
   
6. Blockquote - Zitat
   { "type": "Blockquote", "props": { "text": "..." } }
   
7. BulletList - Aufzählungsliste
   { "type": "BulletList", "props": { "items": ["Punkt 1", "Punkt 2"] } }

8. Image - Bild
   { "type": "Image", "props": { "src": "https://...", "alt": "..." } }

AUSGABE-FORMAT:
{
  "subject": "E-Mail Betreff",
  "elements": [
    { "key": "p1", "type": "Paragraph", "props": { "text": "Hallo {{firstName}}," } },
    { "key": "p2", "type": "Paragraph", "props": { "text": "Hier ist dein Update." } },
    { "key": "s1", "type": "Spacer", "props": { "size": "medium" } },
    { "key": "btn", "type": "Button", "props": { "text": "Mehr erfahren", "href": "https://...", "color": "blue" } }
  ]
}

REGELN:
- Jedes Element braucht einen eindeutigen "key"
- Beginne mit "Hallo {{firstName}}," oder ähnlich
- Nutze Spacer vor Buttons für bessere Optik
- Kein Footer - wird automatisch hinzugefügt
`
