'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { toast } from 'sonner'

const triggers = [
  { 
    value: 'ON_IMPORT', 
    label: 'Bei Import', 
    description: 'Startet automatisch wenn Leads importiert werden' 
  },
  { 
    value: 'MANUAL', 
    label: 'Manuell', 
    description: 'Leads werden manuell zur Sequenz hinzugefügt' 
  },
  { 
    value: 'API_WEBHOOK', 
    label: 'API/Webhook', 
    description: 'Startet via API-Aufruf oder Webhook' 
  },
]

export default function NewSequencePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('MANUAL')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Bitte einen Namen eingeben')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, trigger })
      })

      if (!res.ok) {
        throw new Error('Fehler beim Erstellen')
      }

      const data = await res.json()
      toast.success('Sequenz erstellt')
      router.push(`/sequences/${data.sequence.id}`)
    } catch {
      toast.error('Sequenz konnte nicht erstellt werden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Neue Sequenz erstellen</h1>
        <p className="text-muted-foreground">
          Erstelle eine neue E-Mail-Sequenz für deine Leads
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sequenz-Details</CardTitle>
          <CardDescription>
            Gib deiner Sequenz einen Namen und wähle den Trigger
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="z.B. Willkommens-Serie"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="trigger">Trigger</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Bestimmt wann Leads automatisch in diese Sequenz eintreten
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Erstelle...' : 'Sequenz erstellen'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Abbrechen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
