'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Info, Copy, Check, ExternalLink, Flame, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface WarmupStatus {
  enabled: boolean
  startDate: string
  currentDay: number
  totalDays: number
  dailyLimit: number | null
  sentToday: number
  remaining: number | null
  isComplete: boolean
}

export default function SettingsPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [warmup, setWarmup] = useState<WarmupStatus | null>(null)
  const [warmupLoading, setWarmupLoading] = useState(true)
  const [warmupUpdating, setWarmupUpdating] = useState(false)

  useEffect(() => {
    fetch('/api/warmup')
      .then(res => res.json())
      .then(data => {
        setWarmup(data)
        setWarmupLoading(false)
      })
      .catch(() => setWarmupLoading(false))
  }, [])

  const toggleWarmup = async (enabled: boolean) => {
    setWarmupUpdating(true)
    try {
      const res = await fetch('/api/warmup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warmupEnabled: enabled })
      })
      const data = await res.json()
      setWarmup(data)
      toast.success(enabled ? 'Warm-up aktiviert' : 'Warm-up deaktiviert')
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setWarmupUpdating(false)
    }
  }

  const resetWarmup = async () => {
    if (!confirm('Warm-up wirklich zurücksetzen? Der 42-Tage-Zyklus beginnt von vorne.')) return
    
    setWarmupUpdating(true)
    try {
      const res = await fetch('/api/warmup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetStartDate: true })
      })
      const data = await res.json()
      setWarmup(data)
      toast.success('Warm-up zurückgesetzt')
    } catch {
      toast.error('Fehler beim Zurücksetzen')
    } finally {
      setWarmupUpdating(false)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    toast.success('Kopiert!')
    setTimeout(() => setCopied(null), 2000)
  }

  const apiEndpoint = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/leads`
    : '/api/leads'

  const webhookEndpoint = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/resend`
    : '/api/webhooks/resend'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">
          Konfiguriere dein Newsletter-Tool
        </p>
      </div>

      <Tabs defaultValue="warmup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="warmup">
            <Flame className="h-4 w-4 mr-1" />
            Warm-up
          </TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="resend">Resend</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="warmup" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Domain Warm-up</CardTitle>
                  <CardDescription>
                    Verbessere die Zustellbarkeit durch graduelles Erhöhen des E-Mail-Volumens
                  </CardDescription>
                </div>
                {warmupLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={warmup?.enabled ?? false}
                    onCheckedChange={toggleWarmup}
                    disabled={warmupUpdating}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {warmupLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              ) : warmup ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Aktueller Tag</p>
                      <p className="text-2xl font-bold">
                        {warmup.isComplete ? '✓' : `${warmup.currentDay}/${warmup.totalDays}`}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Tageslimit</p>
                      <p className="text-2xl font-bold">
                        {warmup.dailyLimit ?? '∞'} E-Mails
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Heute gesendet</p>
                      <p className="text-2xl font-bold">{warmup.sentToday}</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-3">Warm-up Schedule</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div className={warmup.currentDay <= 7 ? 'font-medium text-primary' : 'text-muted-foreground'}>
                        Tag 1-7: 10/Tag
                      </div>
                      <div className={warmup.currentDay > 7 && warmup.currentDay <= 14 ? 'font-medium text-primary' : 'text-muted-foreground'}>
                        Tag 8-14: 20/Tag
                      </div>
                      <div className={warmup.currentDay > 14 && warmup.currentDay <= 21 ? 'font-medium text-primary' : 'text-muted-foreground'}>
                        Tag 15-21: 35/Tag
                      </div>
                      <div className={warmup.currentDay > 21 && warmup.currentDay <= 28 ? 'font-medium text-primary' : 'text-muted-foreground'}>
                        Tag 22-28: 50/Tag
                      </div>
                      <div className={warmup.currentDay > 28 && warmup.currentDay <= 35 ? 'font-medium text-primary' : 'text-muted-foreground'}>
                        Tag 29-35: 75/Tag
                      </div>
                      <div className={warmup.currentDay > 35 ? 'font-medium text-primary' : 'text-muted-foreground'}>
                        Tag 36-42: 100/Tag
                      </div>
                    </div>
                    {warmup.isComplete && (
                      <p className="mt-3 text-sm text-green-600">
                        ✓ Warm-up abgeschlossen - Unbegrenztes Senden möglich
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-sm font-medium">Warm-up zurücksetzen</p>
                      <p className="text-xs text-muted-foreground">
                        Startet den 42-Tage-Zyklus von vorne
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={resetWarmup}
                      disabled={warmupUpdating}
                    >
                      {warmupUpdating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4 mr-2" />
                      )}
                      Zurücksetzen
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Fehler beim Laden der Daten</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead API</CardTitle>
              <CardDescription>
                Nutze diese API um Leads programmatisch hinzuzufügen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Endpoint</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>POST-Request an diese URL senden</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono">
                    {apiEndpoint}
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(apiEndpoint, 'api')}
                  >
                    {copied === 'api' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beispiel-Request</Label>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "max@beispiel.de",
    "firstName": "Max",
    "customFields": {
      "firma": "Beispiel GmbH"
    },
    "sequenceId": "optional-sequence-id"
  }'`}
                </pre>
              </div>

              <div className="space-y-2">
                <Label>Response</Label>
                <pre className="p-4 bg-muted rounded-lg text-sm">
{`{
  "success": true,
  "lead": {
    "id": "...",
    "email": "max@beispiel.de",
    "firstName": "Max"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Trigger</CardTitle>
              <CardDescription>
                Trigger eine Sequenz via API für einen bestehenden Lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Endpoint</Label>
                <div className="flex gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono">
                    POST /api/sequences/{'{sequenceId}'}/start
                  </code>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <pre className="p-4 bg-muted rounded-lg text-sm">
{`{
  "leadIds": ["lead-id-1", "lead-id-2"]
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resend Konfiguration</CardTitle>
              <CardDescription>
                Einstellungen für den E-Mail-Versand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Setup-Schritte</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    Erstelle einen Account bei{' '}
                    <a href="https://resend.com" target="_blank" rel="noopener" className="text-primary hover:underline">
                      resend.com <ExternalLink className="inline h-3 w-3" />
                    </a>
                  </li>
                  <li>Füge deine Domain hinzu und verifiziere die DNS-Records</li>
                  <li>Erstelle einen API Key</li>
                  <li>Trage den API Key in deiner <code>.env</code> Datei ein</li>
                </ol>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Webhook URL</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>Diese URL in Resend als Webhook eintragen</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono">
                    {webhookEndpoint}
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(webhookEndpoint, 'webhook')}
                  >
                    {copied === 'webhook' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Aktiviere die Events: email.bounced, email.complained
                </p>
              </div>

              <div className="space-y-2">
                <Label>Environment Variables</Label>
                <pre className="p-4 bg-muted rounded-lg text-sm">
{`RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_DOMAIN=mail.deinedomain.de`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tracking</CardTitle>
              <CardDescription>
                Informationen zum E-Mail-Tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="success">Aktiv</Badge>
                    <h4 className="font-medium">Open Tracking</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ein unsichtbares Pixel wird automatisch eingefügt um Öffnungen zu tracken.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="success">Aktiv</Badge>
                    <h4 className="font-medium">Click Tracking</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Links werden automatisch umgeleitet um Klicks zu erfassen.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="success">Aktiv</Badge>
                    <h4 className="font-medium">Bounce Handling</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Bounced E-Mails werden automatisch erkannt und Leads markiert.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="success">Aktiv</Badge>
                    <h4 className="font-medium">Unsubscribe</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Jede E-Mail enthält einen Abmelde-Link.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
