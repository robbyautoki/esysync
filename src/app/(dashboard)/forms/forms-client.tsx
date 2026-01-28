'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Code, Copy, FileText, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Form {
  id: string
  name: string
  sequenceId: string | null
  segmentId: string | null
  buttonText: string
  successMessage: string
  submissions: number
  createdAt: Date
  sequence: { id: string; name: string } | null
  segment: { id: string; name: string } | null
}

interface Sequence {
  id: string
  name: string
}

interface Segment {
  id: string
  name: string
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`
  return `vor ${Math.floor(days / 30)} Monaten`
}

export function FormsClient({ forms: initialForms, sequences, segments: initialSegments }: { 
  forms: Form[]
  sequences: Sequence[]
  segments: Segment[]
}) {
  const [forms, setForms] = useState(initialForms)
  const [segments, setSegments] = useState(initialSegments)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [embedOpen, setEmbedOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [newForm, setNewForm] = useState({
    name: '',
    sequenceId: '',
    segmentId: '',
    newSegmentName: '',
    buttonText: 'Anmelden',
    successMessage: 'Danke für deine Anmeldung!'
  })
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === forms.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(forms.map(f => f.id))
    }
  }

  const handleCreate = async () => {
    if (!newForm.name.trim()) {
      toast.error('Bitte einen Namen eingeben')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newForm.name,
          sequenceId: newForm.sequenceId || undefined,
          segmentId: newForm.segmentId === '__new__' ? undefined : (newForm.segmentId || undefined),
          newSegmentName: newForm.segmentId === '__new__' ? newForm.newSegmentName : undefined,
          buttonText: newForm.buttonText,
          successMessage: newForm.successMessage
        })
      })

      if (!res.ok) throw new Error()
      
      const data = await res.json()
      const selectedSequence = newForm.sequenceId 
        ? sequences.find(s => s.id === newForm.sequenceId) 
        : null

      // Falls neues Segment erstellt wurde, zur Liste hinzufügen
      if (data.segment && !segments.find(s => s.id === data.segment.id)) {
        setSegments(prev => [...prev, { id: data.segment.id, name: data.segment.name }])
      }
      
      setForms(prev => [{
        ...data,
        createdAt: new Date(),
        sequence: selectedSequence ? { id: selectedSequence.id, name: selectedSequence.name } : null,
        segment: data.segment || null
      }, ...prev])
      
      toast.success('Formular erstellt')
      setCreateOpen(false)
      setNewForm({ name: '', sequenceId: '', segmentId: '', newSegmentName: '', buttonText: 'Anmelden', successMessage: 'Danke für deine Anmeldung!' })
    } catch {
      toast.error('Fehler beim Erstellen')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (formIds: string[]) => {
    setDeleting(true)
    try {
      await Promise.all(
        formIds.map(id => fetch(`/api/forms/${id}`, { method: 'DELETE' }))
      )
      
      setForms(prev => prev.filter(f => !formIds.includes(f.id)))
      setSelectedIds([])
      toast.success(`${formIds.length} Formular(e) gelöscht`)
    } catch {
      toast.error('Fehler beim Löschen')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const getEmbedCode = (form: Form) => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://esysync.vercel.app'
    return `<!-- EsySync Signup Form -->
<form id="esysync-form-${form.id}" onsubmit="return esysyncSubmit(event, '${form.id}')">
  <input type="text" name="firstName" placeholder="Vorname" required style="padding: 10px; margin: 5px 0; width: 100%; box-sizing: border-box;">
  <input type="email" name="email" placeholder="E-Mail" required style="padding: 10px; margin: 5px 0; width: 100%; box-sizing: border-box;">
  <button type="submit" style="padding: 10px 20px; background: #000; color: #fff; border: none; cursor: pointer; width: 100%;">${form.buttonText}</button>
</form>
<script>
async function esysyncSubmit(e, formId) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Wird gesendet...';
  try {
    const res = await fetch('${appUrl}/api/public/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formId,
        firstName: form.firstName.value,
        email: form.email.value
      })
    });
    const data = await res.json();
    if (data.success) {
      form.innerHTML = '<p style="color: green;">' + data.message + '</p>';
    } else {
      alert(data.error || 'Fehler beim Anmelden');
      btn.disabled = false;
      btn.textContent = '${form.buttonText}';
    }
  } catch {
    alert('Fehler beim Anmelden');
    btn.disabled = false;
    btn.textContent = '${form.buttonText}';
  }
  return false;
}
</script>`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('In Zwischenablage kopiert')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Signup Formulare</h1>
          <p className="text-muted-foreground">
            Erstelle Anmeldeformulare zum Einbetten auf deiner Website
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Formular
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.length} ausgewählt</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Löschen
          </Button>
        </div>
      )}

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Keine Formulare</h3>
            <p className="text-muted-foreground text-center mb-4">
              Erstelle dein erstes Anmeldeformular
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Formular erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === forms.length && forms.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sequenz</TableHead>
                <TableHead className="text-center">Anmeldungen</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="w-32">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(form.id)}
                      onCheckedChange={() => toggleSelect(form.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{form.name}</TableCell>
                  <TableCell>
                    {form.sequence ? (
                      <Badge variant="secondary">{form.sequence.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{form.submissions}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeDate(form.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedForm(form)
                          setEmbedOpen(true)
                        }}
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedIds([form.id])
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Formular erstellen</DialogTitle>
            <DialogDescription>
              Erstelle ein Anmeldeformular zum Einbetten auf deiner Website
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="z.B. Newsletter Anmeldung"
              />
            </div>
            <div>
              <Label>Sequenz (optional)</Label>
              <Select
                value={newForm.sequenceId || 'none'}
                onValueChange={(v) => setNewForm({ ...newForm, sequenceId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keine Sequenz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Sequenz</SelectItem>
                  {sequences.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Segment (optional)</Label>
              <Select
                value={newForm.segmentId || 'none'}
                onValueChange={(v) => setNewForm({ ...newForm, segmentId: v === 'none' ? '' : v, newSegmentName: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kein Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Segment</SelectItem>
                  <SelectItem value="__new__">+ Neues Segment erstellen</SelectItem>
                  {segments.map((seg) => (
                    <SelectItem key={seg.id} value={seg.id}>
                      {seg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newForm.segmentId === '__new__' && (
                <Input
                  className="mt-2"
                  value={newForm.newSegmentName}
                  onChange={(e) => setNewForm({ ...newForm, newSegmentName: e.target.value })}
                  placeholder="Segment-Name eingeben"
                />
              )}
              {newForm.sequenceId && !newForm.segmentId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ohne Segment wird automatisch eines erstellt: &quot;Form: {newForm.name || '...'}&quot;
                </p>
              )}
            </div>
            <div>
              <Label>Button-Text</Label>
              <Input
                value={newForm.buttonText}
                onChange={(e) => setNewForm({ ...newForm, buttonText: e.target.value })}
              />
            </div>
            <div>
              <Label>Erfolgsmeldung</Label>
              <Input
                value={newForm.successMessage}
                onChange={(e) => setNewForm({ ...newForm, successMessage: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Wird erstellt...' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embed Code - {selectedForm?.name}</DialogTitle>
            <DialogDescription>
              Kopiere diesen Code und füge ihn in deine Website ein
            </DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <div className="space-y-4">
              <div className="relative">
                <ScrollArea className="h-64 w-full rounded-lg border">
                  <pre className="bg-muted p-4 text-xs whitespace-pre-wrap break-words">
                    {getEmbedCode(selectedForm)}
                  </pre>
                </ScrollArea>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-4"
                  onClick={() => copyToClipboard(getEmbedCode(selectedForm))}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Kopieren
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Der Code enthält HTML und JavaScript. Füge ihn an der Stelle ein, wo das Formular erscheinen soll.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEmbedOpen(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Formulare löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.length === 1
                ? 'Möchtest du dieses Formular wirklich löschen?'
                : `Möchtest du ${selectedIds.length} Formulare wirklich löschen?`}
              <br />
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(selectedIds)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Löschen...
                </>
              ) : (
                'Löschen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
