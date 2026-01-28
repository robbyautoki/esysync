// Konvertiert json-render Format zu TipTap JSON

interface JsonRenderElement {
  key: string
  type: string
  props: Record<string, any>
}

interface JsonRenderDoc {
  subject: string
  elements: JsonRenderElement[]
}

interface TiptapNode {
  type: string
  attrs?: Record<string, any>
  content?: TiptapNode[]
  text?: string
  marks?: { type: string; attrs?: Record<string, any> }[]
}

interface TiptapContent {
  type: 'doc'
  content: TiptapNode[]
}

// Button-Farben Mapping
const BUTTON_COLORS: Record<string, string> = {
  black: '#000000',
  blue: '#2563eb',
  green: '#16a34a'
}

// Konvertiert ein json-render Element zu TipTap Node(s)
function elementToTiptap(element: JsonRenderElement): TiptapNode | null {
  switch (element.type) {
    case 'Paragraph':
      return {
        type: 'paragraph',
        content: [{ type: 'text', text: element.props.text || '' }]
      }
      
    case 'Heading':
      return {
        type: 'heading',
        attrs: { level: parseInt(element.props.level) || 1 },
        content: [{ type: 'text', text: element.props.text || '' }]
      }
      
    case 'Button':
      return {
        type: 'ctaButton',
        attrs: {
          text: element.props.text || 'Button',
          href: element.props.href || '#',
          color: BUTTON_COLORS[element.props.color] || '#000000'
        }
      }
      
    case 'Spacer':
      return {
        type: 'spacer',
        attrs: { size: element.props.size || 'medium' }
      }
      
    case 'Divider':
      return {
        type: 'horizontalRule'
      }
      
    case 'Blockquote':
      return {
        type: 'blockquote',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: element.props.text || '' }]
        }]
      }
      
    case 'BulletList':
      return {
        type: 'bulletList',
        content: (element.props.items || []).map((item: string) => ({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: item }]
          }]
        }))
      }
      
    case 'Image':
      return {
        type: 'image',
        attrs: {
          src: element.props.src || '',
          alt: element.props.alt || ''
        }
      }
      
    default:
      return null
  }
}

// Haupt-Konvertierungsfunktion
export function convertToTiptap(doc: JsonRenderDoc): { subject: string; content: TiptapContent } {
  const nodes: TiptapNode[] = []
  
  for (const element of doc.elements) {
    const node = elementToTiptap(element)
    if (node) {
      nodes.push(node)
    }
  }
  
  // Fallback: mindestens ein leerer Paragraph
  if (nodes.length === 0) {
    nodes.push({ type: 'paragraph', content: [] })
  }
  
  return {
    subject: doc.subject || '',
    content: {
      type: 'doc',
      content: nodes
    }
  }
}

// Parst partielles JSON (für Streaming)
export function parsePartialJson(jsonString: string): Partial<JsonRenderDoc> | null {
  try {
    // Versuche vollständiges JSON zu parsen
    return JSON.parse(jsonString)
  } catch {
    // Versuche unvollständiges JSON zu reparieren
    let fixed = jsonString
    
    // Schließe offene Arrays und Objekte
    const openBrackets = (jsonString.match(/\[/g) || []).length
    const closeBrackets = (jsonString.match(/\]/g) || []).length
    const openBraces = (jsonString.match(/\{/g) || []).length
    const closeBraces = (jsonString.match(/\}/g) || []).length
    
    // Entferne trailing comma
    fixed = fixed.replace(/,\s*$/, '')
    
    // Schließe offene Strukturen
    fixed += ']'.repeat(Math.max(0, openBrackets - closeBrackets))
    fixed += '}'.repeat(Math.max(0, openBraces - closeBraces))
    
    try {
      return JSON.parse(fixed)
    } catch {
      return null
    }
  }
}

// Extrahiert bereits generierte Elemente aus partiellem JSON
export function getStreamedElements(partial: Partial<JsonRenderDoc>): JsonRenderElement[] {
  if (!partial.elements || !Array.isArray(partial.elements)) {
    return []
  }
  
  // Filtere nur vollständige Elemente
  return partial.elements.filter(el => 
    el && typeof el === 'object' && el.type && el.key
  )
}
