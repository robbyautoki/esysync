'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Eye, MousePointerClick, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface TrackingStats {
  totalSent: number
  uniqueOpens: number
  uniqueClicks: number
  openRate: number
  clickRate: number
  recentClicks: Array<{
    leadId: string
    leadName: string
    url: string
    clickedAt: string
  }>
}

interface SequenceTrackingProps {
  sequenceId: string
  trackOpens: boolean
  trackClicks: boolean
  onUpdate: (trackOpens: boolean, trackClicks: boolean) => void
}

export function SequenceTracking({ 
  sequenceId, 
  trackOpens: initialTrackOpens, 
  trackClicks: initialTrackClicks,
  onUpdate 
}: SequenceTrackingProps) {
  const [trackOpens, setTrackOpens] = useState(initialTrackOpens)
  const [trackClicks, setTrackClicks] = useState(initialTrackClicks)
  const [stats, setStats] = useState<TrackingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [sequenceId])

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/tracking`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // Ignore errors
    } finally {
      setLoading(false)
    }
  }

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
      
      onUpdate(newTrackOpens, newTrackClicks)
      toast.success('Tracking-Einstellung gespeichert')
    } catch {
      // Revert on error
      if (type === 'opens') setTrackOpens(!value)
      if (type === 'clicks') setTrackClicks(!value)
      toast.error('Fehler beim Speichern')
    } finally {
      setUpdating(false)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'gerade eben'
    if (diffMins < 60) return `vor ${diffMins} Min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `vor ${diffHours} Std`
    const diffDays = Math.floor(diffHours / 24)
    return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Tracking</CardTitle>
        </div>
        <CardDescription>Statistiken und Einstellungen für diese Sequenz</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{stats.totalSent}</p>
              <p className="text-xs text-muted-foreground">Gesendet</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{stats.openRate}%</p>
              <p className="text-xs text-muted-foreground">Öffnungsrate</p>
              <p className="text-xs text-muted-foreground">({stats.uniqueOpens} Leads)</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{stats.clickRate}%</p>
              <p className="text-xs text-muted-foreground">Klickrate</p>
              <p className="text-xs text-muted-foreground">({stats.uniqueClicks} Leads)</p>
            </div>
          </div>
        ) : null}

        {/* Recent Clicks */}
        {stats && stats.recentClicks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Letzte Klicks</h4>
            <div className="space-y-2">
              {stats.recentClicks.slice(0, 5).map((click, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                    <Link 
                      href={`/leads/${click.leadId}`}
                      className="font-medium hover:underline"
                    >
                      {click.leadName}
                    </Link>
                    <span className="text-muted-foreground truncate max-w-[150px]">
                      ({new URL(click.url).pathname || click.url})
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeTime(click.clickedAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toggles */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="track-opens">Open-Tracking</Label>
            </div>
            <Switch
              id="track-opens"
              checked={trackOpens}
              onCheckedChange={(v) => handleToggle('opens', v)}
              disabled={updating}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="track-clicks">Click-Tracking</Label>
            </div>
            <Switch
              id="track-clicks"
              checked={trackClicks}
              onCheckedChange={(v) => handleToggle('clicks', v)}
              disabled={updating}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
