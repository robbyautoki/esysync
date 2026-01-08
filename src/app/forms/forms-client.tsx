'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Code, Copy, FileText, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Form {
  id: string
  name: string
  sequenceId: string | null
  buttonText: string
  successMessage: string
  submissions: number
  sequence: { id: string; name: string } | null
}

interface Sequence {
  id: string
  name: string
}

export function FormsClient({ forms: initialForms, sequences }: { 
  forms: Form[]
  sequences: Sequence[]
}) {
  const router = useRouter()
  const [forms, setForms] = useState(initialForms)
  const [createOpen, setCreateOpen] = useState(false)
  const [embedOpen, setEmbedOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [newForm, setNewForm] = useState({
    name: '',
    sequenceId: '',
    buttonText: 'Anmelden',
    successMessage: 'Danke für deine Anmeldung!'
  })
  const [creating, setCreating] = useState(false)

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
          buttonText: newForm.buttonText,
          successMessage: newForm.successMessage
        })
      })

      if (!res.ok) throw new Error()
      
      toast.success('Formular erstellt')
      setCreateOpen(false)
      setNewForm({ name: '', sequenceId: '', buttonText: 'Anmelden', successMessage: 'Danke für deine Anmeldung!' })
      router.refresh()
    } catch {
      toast.error('Fehler beim Erstellen')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (formId: string) => {
    try {
      const res = await fetch(`/api/forms/${formId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      
      setForms(forms.filter(f => f.id !== formId))
      toast.success('Formular gelöscht')
    } catch {
      toast.error('Fehler beim Löschen')
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
          <h1 className="text-2xl font-semibold tracking-tight">Signup Forms</h1>
          <p className="text-muted-foreground">
            Erstelle Anmeldeformulare zum Einbetten auf deiner Website
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Formular
        </Button>
      </div>

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{form.name}</CardTitle>
                    <CardDescription>
                      {form.sequence ? form.sequence.name : 'Keine Sequenz'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{form.submissions} Anmeldungen</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedForm(form)
                      setEmbedOpen(true)
                    }}
                  >
                    <Code className="mr-2 h-4 w-4" />
                    Embed Code
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(form.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
                value={newForm.sequenceId}
                onValueChange={(v) => setNewForm({ ...newForm, sequenceId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keine Sequenz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keine Sequenz</SelectItem>
                  {sequences.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogTitle>Embed Code</DialogTitle>
            <DialogDescription>
              Kopiere diesen Code und füge ihn in deine Website ein
            </DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <div className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                  {getEmbedCode(selectedForm)}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(getEmbedCode(selectedForm))}
                >
                  <Copy className="h-4 w-4" />
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
    </div>
  )
}
