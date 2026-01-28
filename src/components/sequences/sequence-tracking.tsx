'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, MousePointerClick, BarChart3, Clock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

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
      </CardContent>
    </Card>
  )
}
