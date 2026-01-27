'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  Upload,
  Trash2,
  Plus,
  Send,
  Image as ImageIcon,
  X,
  FileText
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface EmailSettings {
  footerLogo: string | null
  footerText: string | null
  footerLinks: Array<{ label: string; url: string }> | null
  companyName: string | null
  companyAddress: string | null
  socialLinks: {
    twitter?: string
    linkedin?: string
    instagram?: string
    facebook?: string
  } | null
  primaryColor: string
  senderName: string | null
  replyToEmail: string | null
}

// Footer-Templates für schnellen Einstieg
const FOOTER_TEMPLATES: Record<string, {
  name: string
  description: string
  settings: Partial<EmailSettings>
}> = {
  minimal: {
    name: 'Minimal',
    description: 'Nur Abmelde-Link, kein Logo/Text',
    settings: {
      footerLogo: null,
      footerText: null,
      footerLinks: null,
      companyName: null,
      companyAddress: null,
      socialLinks: null,
    }
  },
  standard: {
    name: 'Standard',
    description: 'Logo + Firmenname + Abmelde-Link',
    settings: {
      footerText: null,
      footerLinks: null,
      companyName: 'Meine Firma GmbH',
      companyAddress: null,
      socialLinks: null,
    }
  },
  social: {
    name: 'Mit Social',
    description: 'Logo + Social Icons + Footer-Links',
    settings: {
      footerText: null,
      footerLinks: [
        { label: 'Impressum', url: 'https://example.com/impressum' },
        { label: 'Datenschutz', url: 'https://example.com/datenschutz' },
      ],
      companyName: 'Meine Firma GmbH',
      companyAddress: null,
      socialLinks: {
        twitter: 'https://twitter.com/meinefirma',
        linkedin: 'https://linkedin.com/company/meinefirma',
      },
    }
  },
  komplett: {
    name: 'Komplett',
    description: 'Logo, Social, Links, Adresse, Copyright',
    settings: {
      footerText: '© 2024 Meine Firma. Alle Rechte vorbehalten.',
      footerLinks: [
        { label: 'Impressum', url: 'https://example.com/impressum' },
        { label: 'Datenschutz', url: 'https://example.com/datenschutz' },
        { label: 'Kontakt', url: 'https://example.com/kontakt' },
      ],
      companyName: 'Meine Firma GmbH',
      companyAddress: 'Musterstraße 1\n12345 Musterstadt',
      socialLinks: {
        twitter: 'https://twitter.com/meinefirma',
        linkedin: 'https://linkedin.com/company/meinefirma',
        instagram: 'https://instagram.com/meinefirma',
        facebook: 'https://facebook.com/meinefirma',
      },
    }
  }
}

export function EmailSettingsTab() {
  const [settings, setSettings] = useState<EmailSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const applyTemplate = (templateKey: string) => {
    const template = FOOTER_TEMPLATES[templateKey]
    if (!template || !settings) return

    setSettings(prev => {
      if (!prev) return null
      return {
        ...prev,
        ...template.settings
      }
    })
    toast.success(`Template "${template.name}" angewendet`)
  }

  useEffect(() => {
    fetch('/api/settings/email')
      .then(res => res.json())
      .then(data => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => {
        toast.error('Fehler beim Laden')
        setLoading(false)
      })
  }, [])

  const saveSettings = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (!res.ok) throw new Error()
      toast.success('Einstellungen gespeichert')
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur Bilder erlaubt (JPEG, PNG, GIF, WebP, SVG)')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Datei zu groß (max. 2MB)')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSettings(prev => prev ? { ...prev, footerLogo: data.url } : null)
      toast.success('Logo hochgeladen')
    } catch (error: any) {
      toast.error(error.message || 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeLogo = () => {
    setSettings(prev => prev ? { ...prev, footerLogo: null } : null)
  }

  const addFooterLink = () => {
    setSettings(prev => {
      if (!prev) return null
      const links = prev.footerLinks || []
      return { ...prev, footerLinks: [...links, { label: '', url: '' }] }
    })
  }

  const updateFooterLink = (index: number, field: 'label' | 'url', value: string) => {
    setSettings(prev => {
      if (!prev || !prev.footerLinks) return prev
      const links = [...prev.footerLinks]
      links[index] = { ...links[index], [field]: value }
      return { ...prev, footerLinks: links }
    })
  }

  const removeFooterLink = (index: number) => {
    setSettings(prev => {
      if (!prev || !prev.footerLinks) return prev
      return { ...prev, footerLinks: prev.footerLinks.filter((_, i) => i !== index) }
    })
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Bitte E-Mail-Adresse eingeben')
      return
    }

    setSendingTest(true)
    try {
      // Erst speichern
      await fetch('/api/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      // Dann Test senden
      const res = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      toast.success('Test-Email gesendet!')
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Senden')
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Fehler beim Laden der Einstellungen
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Template-Auswahl */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schnellstart mit Templates</CardTitle>
          <CardDescription>
            Wähle ein vorgefertigtes Layout als Startpunkt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select onValueChange={applyTemplate}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Template auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FOOTER_TEMPLATES).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">{template.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              <FileText className="inline h-4 w-4 mr-1" />
              Lädt Beispieldaten, die du anpassen kannst
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Footer Logo</CardTitle>
          <CardDescription>
            Wird am Ende jeder E-Mail angezeigt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.footerLogo ? (
            <div className="flex items-center gap-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <img
                  src={settings.footerLogo}
                  alt="Logo"
                  className="max-h-12 max-w-[150px] object-contain"
                />
              </div>
              <Button variant="outline" size="sm" onClick={removeLogo}>
                <Trash2 className="h-4 w-4 mr-2" />
                Entfernen
              </Button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={uploadLogo}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Logo hochladen
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Empfohlen: PNG oder SVG, max. 150px breit
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Firmendaten</CardTitle>
          <CardDescription>
            Werden im Footer angezeigt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Firmenname</Label>
              <Input
                value={settings.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="Meine Firma GmbH"
              />
            </div>
            <div className="space-y-2">
              <Label>Absender-Name</Label>
              <Input
                value={settings.senderName || ''}
                onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                placeholder="Max Mustermann"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Textarea
              value={settings.companyAddress || ''}
              onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
              placeholder="Musterstraße 1&#10;12345 Musterstadt"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Footer-Text</Label>
            <Input
              value={settings.footerText || ''}
              onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              placeholder="© 2024 Meine Firma. Alle Rechte vorbehalten."
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Links */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Footer-Links</CardTitle>
              <CardDescription>
                z.B. Impressum, Datenschutz
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addFooterLink}>
              <Plus className="h-4 w-4 mr-2" />
              Link hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {settings.footerLinks && settings.footerLinks.length > 0 ? (
            <div className="space-y-3">
              {settings.footerLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={link.label}
                    onChange={(e) => updateFooterLink(i, 'label', e.target.value)}
                    placeholder="Label"
                    className="w-32"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateFooterLink(i, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeFooterLink(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch keine Links. Klicke auf "Link hinzufügen" um zu starten.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social Media</CardTitle>
          <CardDescription>
            Links zu deinen Social-Media-Profilen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Twitter/X</Label>
              <Input
                value={settings.socialLinks?.twitter || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  socialLinks: { ...settings.socialLinks, twitter: e.target.value }
                })}
                placeholder="https://twitter.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input
                value={settings.socialLinks?.linkedin || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  socialLinks: { ...settings.socialLinks, linkedin: e.target.value }
                })}
                placeholder="https://linkedin.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                value={settings.socialLinks?.instagram || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  socialLinks: { ...settings.socialLinks, instagram: e.target.value }
                })}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input
                value={settings.socialLinks?.facebook || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  socialLinks: { ...settings.socialLinks, facebook: e.target.value }
                })}
                placeholder="https://facebook.com/..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Design */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Design</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Primärfarbe</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border"
              />
              <Input
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="w-28 font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Wird für Links und Buttons verwendet
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test-Email</CardTitle>
          <CardDescription>
            Sende eine Test-Email um den Footer zu überprüfen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@beispiel.de"
              className="flex-1"
            />
            <Button onClick={sendTestEmail} disabled={sendingTest}>
              {sendingTest ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Test senden
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Einstellungen speichern
        </Button>
      </div>
    </div>
  )
}
