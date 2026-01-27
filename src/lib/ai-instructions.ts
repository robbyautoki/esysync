// AI Instructions (System-Prompts) für E-Mail-Generierung
// Gespeichert in localStorage

export interface Instruction {
  id: string
  name: string
  prompt: string
  isDefault?: boolean
  isBuiltIn?: boolean
}

const STORAGE_KEY = 'esysync-ai-instructions'

// Vorinstallierte Instructions
const BUILTIN_INSTRUCTIONS: Instruction[] = [
  {
    id: 'friendly',
    name: 'Freundlich & persönlich',
    prompt: `Schreibe in einem warmen, persönlichen Ton. 
Verwende "du" statt "Sie". 
Sei authentisch und nicht zu förmlich.
Nutze gelegentlich Emojis, aber übertreibe nicht.
Halte die Sätze kurz und verständlich.`,
    isDefault: true,
    isBuiltIn: true
  },
  {
    id: 'professional',
    name: 'Professionell & sachlich',
    prompt: `Schreibe in einem professionellen, aber nicht steifen Ton.
Verwende "Sie" als Anrede.
Sei klar und präzise.
Keine Emojis verwenden.
Fokussiere auf den Mehrwert für den Leser.`,
    isBuiltIn: true
  },
  {
    id: 'short',
    name: 'Kurz & knapp',
    prompt: `Halte die E-Mail so kurz wie möglich.
Maximal 3-4 kurze Absätze.
Komme direkt zum Punkt.
Kein Smalltalk, nur das Wesentliche.
Ein klarer Call-to-Action am Ende.`,
    isBuiltIn: true
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    prompt: `Beginne mit einer kleinen Geschichte oder Anekdote.
Schaffe eine emotionale Verbindung.
Verwende bildhafte Sprache.
Führe den Leser durch eine Erzählung zum Punkt.
Ende mit einer klaren Handlungsaufforderung.`,
    isBuiltIn: true
  }
]

export function getInstructions(): Instruction[] {
  if (typeof window === 'undefined') return BUILTIN_INSTRUCTIONS
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const custom = stored ? JSON.parse(stored) as Instruction[] : []
    return [...BUILTIN_INSTRUCTIONS, ...custom]
  } catch {
    return BUILTIN_INSTRUCTIONS
  }
}

export function getDefaultInstruction(): Instruction {
  const all = getInstructions()
  return all.find(i => i.isDefault) || all[0]
}

export function saveInstruction(instruction: Omit<Instruction, 'id'>): Instruction {
  const newInstruction: Instruction = {
    ...instruction,
    id: `custom-${Date.now()}`
  }
  
  const custom = getCustomInstructions()
  custom.push(newInstruction)
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
  }
  
  return newInstruction
}

export function updateInstruction(id: string, updates: Partial<Instruction>): void {
  const custom = getCustomInstructions()
  const index = custom.findIndex(i => i.id === id)
  
  if (index !== -1) {
    custom[index] = { ...custom[index], ...updates }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
    }
  }
}

export function deleteInstruction(id: string): void {
  const custom = getCustomInstructions().filter(i => i.id !== id)
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
  }
}

function getCustomInstructions(): Instruction[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}
