'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Wand2,
  Check
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Instruction,
  getInstructions,
  getDefaultInstruction,
  saveInstruction,
  updateInstruction,
  deleteInstruction
} from '@/lib/ai-instructions'

interface AiEmailWriterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (subject: string, content: any) => void
}

export function AiEmailWriter({ open, onOpenChange, onApply }: AiEmailWriterProps) {
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [selectedInstructionId, setSelectedInstructionId] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ subject: string; content: any } | null>(null)
  
  // Instruction Editor Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  
  useEffect(() => {
    if (open) {
      loadInstructions()
    }
  }, [open])
  
  const loadInstructions = () => {
    const loaded = getInstructions()
    setInstructions(loaded)
    const defaultInstr = getDefaultInstruction()
    setSelectedInstructionId(defaultInstr.id)
  }
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Bitte beschreibe, was die E-Mail machen soll')
      return
    }
    
    const selectedInstruction = instructions.find(i => i.id === selectedInstructionId)
    
    setGenerating(true)
    setResult(null)
    
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: selectedInstruction?.prompt || '',
          prompt,
          variables: ['firstName', 'email']
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Generierung fehlgeschlagen')
      }
      
      const data = await res.json()
      setResult(data)
      toast.success('E-Mail generiert!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler bei der Generierung')
    } finally {
      setGenerating(false)
    }
  }
  
  const handleApply = () => {
    if (result) {
      onApply(result.subject, result.content)
      onOpenChange(false)
      setPrompt('')
      setResult(null)
      toast.success('E-Mail übernommen')
    }
  }
  
  const openNewInstructionDialog = () => {
    setEditingInstruction(null)
    setEditName('')
    setEditPrompt('')
    setEditDialogOpen(true)
  }
  
  const openEditInstructionDialog = (instruction: Instruction) => {
    setEditingInstruction(instruction)
    setEditName(instruction.name)
    setEditPrompt(instruction.prompt)
    setEditDialogOpen(true)
  }
  
  const handleSaveInstruction = () => {
    if (!editName.trim() || !editPrompt.trim()) {
      toast.error('Name und Anweisung sind erforderlich')
      return
    }
    
    if (editingInstruction && !editingInstruction.isBuiltIn) {
      updateInstruction(editingInstruction.id, {
        name: editName,
        prompt: editPrompt
      })
      toast.success('Instruction aktualisiert')
    } else {
      const newInstr = saveInstruction({
        name: editName,
        prompt: editPrompt
      })
      setSelectedInstructionId(newInstr.id)
      toast.success('Instruction erstellt')
    }
    
    loadInstructions()
    setEditDialogOpen(false)
  }
  
  const handleDeleteInstruction = (id: string) => {
    deleteInstruction(id)
    loadInstructions()
    const defaultInstr = getDefaultInstruction()
    setSelectedInstructionId(defaultInstr.id)
    toast.success('Instruction gelöscht')
  }
  
  const selectedInstruction = instructions.find(i => i.id === selectedInstructionId)
  
  // Konvertiere TipTap Content zu Plain Text für Vorschau
  const getPreviewText = (content: any): string => {
    if (!content?.content) return ''
    
    const extractText = (node: any): string => {
      if (node.type === 'text') return node.text || ''
      if (node.content) return node.content.map(extractText).join('')
      return ''
    }
    
    return content.content
      .map((node: any) => {
        if (node.type === 'bulletList') {
          return node.content
            .map((item: any) => '• ' + extractText(item))
            .join('\n')
        }
        return extractText(node)
      })
      .join('\n\n')
  }
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              E-Mail mit KI schreiben
            </SheetTitle>
            <SheetDescription>
              Beschreibe was die E-Mail machen soll und die KI schreibt sie für dich
            </SheetDescription>
          </SheetHeader>
          
          <div className="grid grid-cols-2 gap-6 mt-6 h-[calc(100%-100px)]">
            {/* Left: Input */}
            <div className="space-y-4">
              {/* Instruction Select */}
              <div className="space-y-2">
                <Label>Stil / Instruction</Label>
                <div className="flex gap-2">
                  <Select value={selectedInstructionId} onValueChange={setSelectedInstructionId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Wähle einen Stil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {instructions.map(instr => (
                        <SelectItem key={instr.id} value={instr.id}>
                          <div className="flex items-center gap-2">
                            {instr.name}
                            {instr.isBuiltIn && (
                              <Badge variant="secondary" className="text-xs">Standard</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={openNewInstructionDialog}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  {selectedInstruction && !selectedInstruction.isBuiltIn && (
                    <>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => openEditInstructionDialog(selectedInstruction)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleDeleteInstruction(selectedInstruction.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                {selectedInstruction && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {selectedInstruction.prompt}
                  </p>
                )}
              </div>
              
              {/* Prompt Input */}
              <div className="space-y-2 flex-1">
                <Label>Was soll die E-Mail machen?</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="z.B. Willkommens-Email für neue Newsletter-Abonnenten. Soll sich für die Anmeldung bedanken und einen ersten Tipp geben."
                  className="min-h-[200px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Je detaillierter die Beschreibung, desto besser das Ergebnis
                </p>
              </div>
              
              {/* Generate Button */}
              <Button 
                onClick={handleGenerate} 
                disabled={generating || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    E-Mail generieren
                  </>
                )}
              </Button>
            </div>
            
            {/* Right: Preview */}
            <div className="space-y-4">
              <Label>Vorschau</Label>
              
              {generating ? (
                <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg bg-muted/30">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">KI schreibt E-Mail...</p>
                </div>
              ) : result ? (
                <div className="border rounded-lg overflow-hidden">
                  {/* Subject */}
                  <div className="bg-muted/50 p-3 border-b">
                    <p className="text-sm text-muted-foreground">Betreff:</p>
                    <p className="font-medium">{result.subject}</p>
                  </div>
                  
                  {/* Body */}
                  <ScrollArea className="h-[350px]">
                    <div className="p-4 whitespace-pre-wrap text-sm leading-relaxed">
                      {getPreviewText(result.content)}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg bg-muted/30 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mb-3 opacity-50" />
                  <p className="text-sm">Hier erscheint die generierte E-Mail</p>
                </div>
              )}
              
              {/* Apply Button */}
              {result && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex-1"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Neu generieren
                  </Button>
                  <Button onClick={handleApply} className="flex-1">
                    <Check className="mr-2 h-4 w-4" />
                    Übernehmen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Instruction Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInstruction ? 'Instruction bearbeiten' : 'Neue Instruction'}
            </DialogTitle>
            <DialogDescription>
              Instructions definieren den Schreibstil für generierte E-Mails
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="z.B. Locker & witzig"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Anweisung (System-Prompt)</Label>
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="z.B. Schreibe locker und humorvoll. Verwende Wortspiele wo passend..."
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                Diese Anweisung wird der KI mitgegeben, um den Schreibstil zu definieren
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveInstruction}>
              {editingInstruction ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
