// Editor Functions - Präzise Modifikationen am TipTap Content

export interface TiptapContent {
  type: 'doc'
  content: TiptapNode[]
}

export interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  attrs?: Record<string, any>
  marks?: Array<{ type: string; attrs?: Record<string, any> }>
}

export interface EditorAction {
  function: string
  args: Record<string, any>
}

// Hilfsfunktion: Deep Clone
function cloneContent(content: TiptapContent): TiptapContent {
  return JSON.parse(JSON.stringify(content))
}

// Hilfsfunktion: Finde Node-Index by Type
function findNodeIndex(content: TiptapContent, type: string, occurrence: number = 0): number {
  let count = 0
  for (let i = 0; i < content.content.length; i++) {
    if (content.content[i].type === type) {
      if (count === occurrence) return i
      count++
    }
  }
  return -1
}

// ============ PARAGRAPH FUNCTIONS ============

export function insertParagraph(content: TiptapContent, position: number, text: string): TiptapContent {
  const newContent = cloneContent(content)
  const newNode: TiptapNode = {
    type: 'paragraph',
    content: [{ type: 'text', text }]
  }
  
  const pos = Math.min(Math.max(0, position), newContent.content.length)
  newContent.content.splice(pos, 0, newNode)
  return newContent
}

export function modifyParagraph(content: TiptapContent, position: number, newText: string): TiptapContent {
  const newContent = cloneContent(content)
  if (position >= 0 && position < newContent.content.length) {
    const node = newContent.content[position]
    if (node.type === 'paragraph') {
      node.content = [{ type: 'text', text: newText }]
    }
  }
  return newContent
}

export function deleteParagraph(content: TiptapContent, position: number): TiptapContent {
  const newContent = cloneContent(content)
  if (position >= 0 && position < newContent.content.length) {
    newContent.content.splice(position, 1)
  }
  return newContent
}

// ============ TEXT FORMATTING FUNCTIONS ============

export function setTextColor(content: TiptapContent, position: number, color: string): TiptapContent {
  const newContent = cloneContent(content)
  if (position >= 0 && position < newContent.content.length) {
    const node = newContent.content[position]
    if (node.content) {
      node.content = node.content.map(child => {
        if (child.type === 'text') {
          const marks = child.marks?.filter(m => m.type !== 'textStyle') || []
          marks.push({ type: 'textStyle', attrs: { color } })
          return { ...child, marks }
        }
        return child
      })
    }
  }
  return newContent
}

export function setTextHighlight(content: TiptapContent, position: number, color: string): TiptapContent {
  const newContent = cloneContent(content)
  if (position >= 0 && position < newContent.content.length) {
    const node = newContent.content[position]
    if (node.content) {
      node.content = node.content.map(child => {
        if (child.type === 'text') {
          const marks = child.marks?.filter(m => m.type !== 'highlight') || []
          marks.push({ type: 'highlight', attrs: { color } })
          return { ...child, marks }
        }
        return child
      })
    }
  }
  return newContent
}

export function setTextBold(content: TiptapContent, position: number, bold: boolean): TiptapContent {
  const newContent = cloneContent(content)
  if (position >= 0 && position < newContent.content.length) {
    const node = newContent.content[position]
    if (node.content) {
      node.content = node.content.map(child => {
        if (child.type === 'text') {
          let marks = child.marks?.filter(m => m.type !== 'bold') || []
          if (bold) marks.push({ type: 'bold' })
          return { ...child, marks: marks.length > 0 ? marks : undefined }
        }
        return child
      })
    }
  }
  return newContent
}

export function setTextItalic(content: TiptapContent, position: number, italic: boolean): TiptapContent {
  const newContent = cloneContent(content)
  if (position >= 0 && position < newContent.content.length) {
    const node = newContent.content[position]
    if (node.content) {
      node.content = node.content.map(child => {
        if (child.type === 'text') {
          let marks = child.marks?.filter(m => m.type !== 'italic') || []
          if (italic) marks.push({ type: 'italic' })
          return { ...child, marks: marks.length > 0 ? marks : undefined }
        }
        return child
      })
    }
  }
  return newContent
}

// ============ BUTTON FUNCTIONS ============

export function insertButton(
  content: TiptapContent, 
  position: number, 
  text: string, 
  url: string, 
  color: string = '#000000'
): TiptapContent {
  const newContent = cloneContent(content)
  const newNode: TiptapNode = {
    type: 'ctaButton',
    attrs: { text, href: url, color }
  }
  
  const pos = Math.min(Math.max(0, position), newContent.content.length)
  newContent.content.splice(pos, 0, newNode)
  return newContent
}

export function modifyButton(
  content: TiptapContent, 
  position: number, 
  changes: { text?: string; url?: string; color?: string }
): TiptapContent {
  const newContent = cloneContent(content)
  
  // Find button at position or find first button
  let buttonIndex = position
  if (newContent.content[position]?.type !== 'ctaButton') {
    buttonIndex = findNodeIndex(newContent, 'ctaButton', 0)
  }
  
  if (buttonIndex >= 0 && newContent.content[buttonIndex]?.type === 'ctaButton') {
    const node = newContent.content[buttonIndex]
    if (changes.text !== undefined) node.attrs!.text = changes.text
    if (changes.url !== undefined) node.attrs!.href = changes.url
    if (changes.color !== undefined) node.attrs!.color = changes.color
  }
  return newContent
}

export function deleteButton(content: TiptapContent, position: number): TiptapContent {
  const newContent = cloneContent(content)
  
  let buttonIndex = position
  if (newContent.content[position]?.type !== 'ctaButton') {
    buttonIndex = findNodeIndex(newContent, 'ctaButton', 0)
  }
  
  if (buttonIndex >= 0) {
    newContent.content.splice(buttonIndex, 1)
  }
  return newContent
}

// ============ SPACER FUNCTIONS ============

export function insertSpacer(
  content: TiptapContent, 
  position: number, 
  size: 'small' | 'medium' | 'large' = 'medium'
): TiptapContent {
  const newContent = cloneContent(content)
  const newNode: TiptapNode = {
    type: 'spacer',
    attrs: { size }
  }
  
  const pos = Math.min(Math.max(0, position), newContent.content.length)
  newContent.content.splice(pos, 0, newNode)
  return newContent
}

export function modifySpacer(
  content: TiptapContent, 
  position: number, 
  size: 'small' | 'medium' | 'large'
): TiptapContent {
  const newContent = cloneContent(content)
  
  let spacerIndex = position
  if (newContent.content[position]?.type !== 'spacer') {
    spacerIndex = findNodeIndex(newContent, 'spacer', 0)
  }
  
  if (spacerIndex >= 0 && newContent.content[spacerIndex]?.type === 'spacer') {
    newContent.content[spacerIndex].attrs!.size = size
  }
  return newContent
}

export function deleteSpacer(content: TiptapContent, position: number): TiptapContent {
  const newContent = cloneContent(content)
  
  let spacerIndex = position
  if (newContent.content[position]?.type !== 'spacer') {
    spacerIndex = findNodeIndex(newContent, 'spacer', 0)
  }
  
  if (spacerIndex >= 0) {
    newContent.content.splice(spacerIndex, 1)
  }
  return newContent
}

// ============ DIVIDER FUNCTIONS ============

export function insertDivider(content: TiptapContent, position: number): TiptapContent {
  const newContent = cloneContent(content)
  const newNode: TiptapNode = { type: 'horizontalRule' }
  
  const pos = Math.min(Math.max(0, position), newContent.content.length)
  newContent.content.splice(pos, 0, newNode)
  return newContent
}

export function deleteDivider(content: TiptapContent, position: number): TiptapContent {
  const newContent = cloneContent(content)
  
  let dividerIndex = position
  if (newContent.content[position]?.type !== 'horizontalRule') {
    dividerIndex = findNodeIndex(newContent, 'horizontalRule', 0)
  }
  
  if (dividerIndex >= 0) {
    newContent.content.splice(dividerIndex, 1)
  }
  return newContent
}

// ============ HEADING FUNCTIONS ============

export function insertHeading(
  content: TiptapContent, 
  position: number, 
  level: 1 | 2, 
  text: string
): TiptapContent {
  const newContent = cloneContent(content)
  const newNode: TiptapNode = {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }]
  }
  
  const pos = Math.min(Math.max(0, position), newContent.content.length)
  newContent.content.splice(pos, 0, newNode)
  return newContent
}

export function modifyHeading(
  content: TiptapContent, 
  position: number, 
  changes: { level?: 1 | 2; text?: string }
): TiptapContent {
  const newContent = cloneContent(content)
  if (position >= 0 && position < newContent.content.length) {
    const node = newContent.content[position]
    if (node.type === 'heading') {
      if (changes.level !== undefined) node.attrs!.level = changes.level
      if (changes.text !== undefined) {
        node.content = [{ type: 'text', text: changes.text }]
      }
    }
  }
  return newContent
}

export function deleteHeading(content: TiptapContent, position: number): TiptapContent {
  return deleteParagraph(content, position)
}

// ============ BLOCKQUOTE FUNCTIONS ============

export function insertBlockquote(content: TiptapContent, position: number, text: string): TiptapContent {
  const newContent = cloneContent(content)
  const newNode: TiptapNode = {
    type: 'blockquote',
    content: [{
      type: 'paragraph',
      content: [{ type: 'text', text }]
    }]
  }
  
  const pos = Math.min(Math.max(0, position), newContent.content.length)
  newContent.content.splice(pos, 0, newNode)
  return newContent
}

export function modifyBlockquote(content: TiptapContent, position: number, text: string): TiptapContent {
  const newContent = cloneContent(content)
  
  let bqIndex = position
  if (newContent.content[position]?.type !== 'blockquote') {
    bqIndex = findNodeIndex(newContent, 'blockquote', 0)
  }
  
  if (bqIndex >= 0 && newContent.content[bqIndex]?.type === 'blockquote') {
    newContent.content[bqIndex].content = [{
      type: 'paragraph',
      content: [{ type: 'text', text }]
    }]
  }
  return newContent
}

export function deleteBlockquote(content: TiptapContent, position: number): TiptapContent {
  const newContent = cloneContent(content)
  
  let bqIndex = position
  if (newContent.content[position]?.type !== 'blockquote') {
    bqIndex = findNodeIndex(newContent, 'blockquote', 0)
  }
  
  if (bqIndex >= 0) {
    newContent.content.splice(bqIndex, 1)
  }
  return newContent
}

// ============ LIST FUNCTIONS ============

export function insertBulletList(content: TiptapContent, position: number, items: string[]): TiptapContent {
  const newContent = cloneContent(content)
  const newNode: TiptapNode = {
    type: 'bulletList',
    content: items.map(item => ({
      type: 'listItem',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: item }]
      }]
    }))
  }
  
  const pos = Math.min(Math.max(0, position), newContent.content.length)
  newContent.content.splice(pos, 0, newNode)
  return newContent
}

export function insertOrderedList(content: TiptapContent, position: number, items: string[]): TiptapContent {
  const newContent = cloneContent(content)
  const newNode: TiptapNode = {
    type: 'orderedList',
    content: items.map(item => ({
      type: 'listItem',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: item }]
      }]
    }))
  }
  
  const pos = Math.min(Math.max(0, position), newContent.content.length)
  newContent.content.splice(pos, 0, newNode)
  return newContent
}

export function deleteList(content: TiptapContent, position: number): TiptapContent {
  return deleteParagraph(content, position)
}

// ============ GENERAL FUNCTIONS ============

export function moveNode(content: TiptapContent, fromPosition: number, toPosition: number): TiptapContent {
  const newContent = cloneContent(content)
  if (fromPosition >= 0 && fromPosition < newContent.content.length) {
    const [node] = newContent.content.splice(fromPosition, 1)
    const targetPos = Math.min(Math.max(0, toPosition), newContent.content.length)
    newContent.content.splice(targetPos, 0, node)
  }
  return newContent
}

export function duplicateNode(content: TiptapContent, position: number): TiptapContent {
  const newContent = cloneContent(content)
  if (position >= 0 && position < newContent.content.length) {
    const nodeCopy = JSON.parse(JSON.stringify(newContent.content[position]))
    newContent.content.splice(position + 1, 0, nodeCopy)
  }
  return newContent
}

export function deleteNode(content: TiptapContent, position: number): TiptapContent {
  return deleteParagraph(content, position)
}

// ============ EXECUTE ACTIONS ============

export function executeActions(content: TiptapContent, actions: EditorAction[]): TiptapContent {
  let result = cloneContent(content)
  
  for (const action of actions) {
    switch (action.function) {
      // Paragraphs
      case 'insertParagraph':
        result = insertParagraph(result, action.args.position, action.args.text)
        break
      case 'modifyParagraph':
        result = modifyParagraph(result, action.args.position, action.args.text)
        break
      case 'deleteParagraph':
        result = deleteParagraph(result, action.args.position)
        break
      
      // Text formatting
      case 'setTextColor':
        result = setTextColor(result, action.args.position, action.args.color)
        break
      case 'setTextHighlight':
        result = setTextHighlight(result, action.args.position, action.args.color)
        break
      case 'setTextBold':
        result = setTextBold(result, action.args.position, action.args.bold)
        break
      case 'setTextItalic':
        result = setTextItalic(result, action.args.position, action.args.italic)
        break
      
      // Buttons
      case 'insertButton':
        result = insertButton(result, action.args.position, action.args.text, action.args.url, action.args.color)
        break
      case 'modifyButton':
        result = modifyButton(result, action.args.position, action.args)
        break
      case 'deleteButton':
        result = deleteButton(result, action.args.position)
        break
      
      // Spacers
      case 'insertSpacer':
        result = insertSpacer(result, action.args.position, action.args.size)
        break
      case 'modifySpacer':
        result = modifySpacer(result, action.args.position, action.args.size)
        break
      case 'deleteSpacer':
        result = deleteSpacer(result, action.args.position)
        break
      
      // Dividers
      case 'insertDivider':
        result = insertDivider(result, action.args.position)
        break
      case 'deleteDivider':
        result = deleteDivider(result, action.args.position)
        break
      
      // Headings
      case 'insertHeading':
        result = insertHeading(result, action.args.position, action.args.level, action.args.text)
        break
      case 'modifyHeading':
        result = modifyHeading(result, action.args.position, action.args)
        break
      case 'deleteHeading':
        result = deleteHeading(result, action.args.position)
        break
      
      // Blockquotes
      case 'insertBlockquote':
        result = insertBlockquote(result, action.args.position, action.args.text)
        break
      case 'modifyBlockquote':
        result = modifyBlockquote(result, action.args.position, action.args.text)
        break
      case 'deleteBlockquote':
        result = deleteBlockquote(result, action.args.position)
        break
      
      // Lists
      case 'insertBulletList':
        result = insertBulletList(result, action.args.position, action.args.items)
        break
      case 'insertOrderedList':
        result = insertOrderedList(result, action.args.position, action.args.items)
        break
      case 'deleteList':
        result = deleteList(result, action.args.position)
        break
      
      // General
      case 'moveNode':
        result = moveNode(result, action.args.fromPosition, action.args.toPosition)
        break
      case 'duplicateNode':
        result = duplicateNode(result, action.args.position)
        break
      case 'deleteNode':
        result = deleteNode(result, action.args.position)
        break
    }
  }
  
  return result
}
