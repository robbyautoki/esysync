'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function NewLeadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([])

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }])
  }

  const updateCustomField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customFields]
    updated[index][field] = value
    setCustomFields(updated)
  }

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !firstName.trim()) {
      toast.error('Bitte E-Mail und Vorname ausfüllen')
      return
    }

    setLoading(true)

    try {
      const customFieldsObj: Record<string, string> = {}
      customFields.forEach(({ key, value }) => {
        if (key.trim() && value.trim()) {
          customFieldsObj[key.trim()] = value.trim()
        }
      })

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          customFields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'duplicate') {
          toast.error('Diese E-Mail-Adresse existiert bereits')
        } else {
          throw new Error(data.message || 'Fehler beim Erstellen')
        }
        return
      }

      toast.success('Lead erfolgreich erstellt')
      router.push('/leads')
    } catch (error: any) {
      toast.error(error.message || 'Lead konnte nicht erstellt werden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/leads">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zurück zur Liste</TooltipContent>
        </Tooltip>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Neuen Lead hinzufügen</h1>
          <p className="text-muted-foreground">
            Füge einen einzelnen Lead manuell hinzu
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead-Informationen</CardTitle>
          <CardDescription>
            E-Mail und Vorname sind Pflichtfelder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="max@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname *</Label>
                <Input
                  id="firstName"
                  placeholder="Max"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Custom Fields</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Zusätzliche Felder die in E-Mails als Variablen genutzt werden können
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                  <Plus className="mr-2 h-4 w-4" />
                  Feld hinzufügen
                </Button>
              </div>

              {customFields.length > 0 && (
                <div className="space-y-3">
                  {customFields.map((field, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="Feldname (z.B. firma)"
                          value={field.key}
                          onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Wert (z.B. Beispiel GmbH)"
                          value={field.value}
                          onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                        />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCustomField(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Feld entfernen</TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              )}

              {customFields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Keine Custom Fields. Klicke auf "Feld hinzufügen" um zusätzliche Daten zu speichern.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" disabled={loading}>
                {loading ? 'Wird erstellt...' : 'Lead erstellen'}
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
