'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Eye, MousePointerClick, BarChart3, Clock, ChevronDown, TrendingUp, Users, Mail, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

interface PreviewData {
  totalLeads: number
  emailSteps: number
  totalEmails: number
  estimatedDays: number
  warmup: {
    dailyLimit: number | null
    isComplete: boolean
  }
}

interface SequenceTrackingProps {
  sequenceId: string
  trackOpens: boolean
  trackClicks: boolean
  sendTime: string | null
  onUpdate: (trackOpens: boolean, trackClicks: boolean, sendTime: string | null) => void
  onOpenAnalytics?: () => void
}

export function SequenceTracking({ 
  sequenceId, 
  trackOpens: initialTrackOpens, 
  trackClicks: initialTrackClicks,
  sendTime: initialSendTime,
  onUpdate,
  onOpenAnalytics
}: SequenceTrackingProps) {
  const [trackOpens, setTrackOpens] = useState(initialTrackOpens)
  const [trackClicks, setTrackClicks] = useState(initialTrackClicks)
  const [sendTime, setSendTime] = useState(initialSendTime)
  const [updating, setUpdating] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/sequences/${sequenceId}/preview`)
        if (res.ok) {
          const data = await res.json()
          setPreview(data.preview)
        }
      } catch {
        // Ignore errors
      } finally {
        setPreviewLoading(false)
      }
    }
    fetchPreview()
  }, [sequenceId])

  const handleToggle = async (type: 'opens' | 'clicks', value: boolean) => {
    setUpdating(true)
    
    const newTrackOpens = type === 'opens' ? value : trackOpens
    const newTrackClicks = type === 'clicks' ? value : trackClicks
    
    if (type === 'opens') setTrackOpens(value)
    if (type === 'clicks') setTrackClicks(value)

    try {
      const res = await fetch(`/api/sequences/${sequenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trackOpens: newTrackOpens, 
          trackClicks: newTrackClicks 
        })
      })

      if (!res.ok) throw new Error()
      
      onUpdate(newTrackOpens, newTrackClicks, sendTime)
      toast.success('Einstellung gespeichert')
    } catch {
      // Revert on error
      if (type === 'opens') setTrackOpens(!value)
      if (type === 'clicks') setTrackClicks(!value)
      toast.error('Fehler beim Speichern')
    } finally {
      setUpdating(false)
    }
  }

  const handleSendTimeChange = async (value: string) => {
    setUpdating(true)
    const newSendTime = value === 'immediate' ? null : value
    setSendTime(newSendTime)

    try {
      const res = await fetch(`/api/sequences/${sequenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendTime: newSendTime })
      })

      if (!res.ok) throw new Error()
      
      onUpdate(trackOpens, trackClicks, newSendTime)
      toast.success('Sendezeit gespeichert')
    } catch {
      setSendTime(initialSendTime)
      toast.error('Fehler beim Speichern')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Einstellungen</CardTitle>
          {onOpenAnalytics && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={onOpenAnalytics}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analytics anzeigen</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Öffnungen */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Eye className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <Label htmlFor="track-opens" className="font-medium">Öffnungen tracken</Label>
              <p className="text-sm text-muted-foreground">Zählt wenn Empfänger die E-Mail öffnen</p>
            </div>
          </div>
          <Switch
            id="track-opens"
            checked={trackOpens}
            onCheckedChange={(v) => handleToggle('opens', v)}
            disabled={updating}
          />
        </div>

        {/* Klicks */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <MousePointerClick className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <Label htmlFor="track-clicks" className="font-medium">Klicks tracken</Label>
              <p className="text-sm text-muted-foreground">Zählt Klicks auf Links in der E-Mail</p>
            </div>
          </div>
          <Switch
            id="track-clicks"
            checked={trackClicks}
            onCheckedChange={(v) => handleToggle('clicks', v)}
            disabled={updating}
          />
        </div>

        {/* Sendezeit */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <Label className="font-medium">Versandzeit</Label>
              <p className="text-sm text-muted-foreground">E-Mails werden zu dieser Uhrzeit gesendet</p>
            </div>
          </div>
          <Select 
            value={sendTime || 'immediate'} 
            onValueChange={handleSendTimeChange}
            disabled={updating}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Sofort</SelectItem>
              <SelectItem value="07:00">07:00</SelectItem>
              <SelectItem value="09:00">09:00</SelectItem>
              <SelectItem value="12:00">12:00</SelectItem>
              <SelectItem value="15:00">15:00</SelectItem>
              <SelectItem value="18:00">18:00</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Versand-Vorschau */}
        <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between px-3 py-2 h-auto border-t rounded-none -mx-6 mt-4"
              style={{ width: 'calc(100% + 3rem)' }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Versand-Vorschau</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${previewOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            {previewLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : preview ? (
              <div className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-bold">{preview.totalLeads}</p>
                      <p className="text-xs text-muted-foreground">Leads aktiv</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-bold">{preview.emailSteps}</p>
                      <p className="text-xs text-muted-foreground">E-Mail-Steps</p>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                {(preview.totalLeads > 0 || preview.emailSteps > 0) && (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Gesamt E-Mails:</span>
                      <span className="font-medium">{preview.totalEmails.toLocaleString('de-DE')}</span>
                    </div>
                    {preview.estimatedDays > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Geschätzte Dauer:</span>
                        <span className="font-medium">
                          ~{preview.estimatedDays} {preview.estimatedDays === 1 ? 'Tag' : 'Tage'}
                        </span>
                      </div>
                    )}
                    {!preview.warmup.isComplete && preview.warmup.dailyLimit && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tageslimit (Warmup):</span>
                        <Badge variant="outline">{preview.warmup.dailyLimit}/Tag</Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {preview.totalLeads === 0 && preview.emailSteps === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Füge Leads und E-Mail-Steps hinzu
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Vorschau nicht verfügbar
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
