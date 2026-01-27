'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Flame, CheckCircle2, Clock } from 'lucide-react'

interface WarmupStatus {
  enabled: boolean
  startDate: string
  currentDay: number
  totalDays: number
  dailyLimit: number | null
  sentToday: number
  remaining: number | null
  isComplete: boolean
  nextLimitIncrease: { inDays: number; newLimit: number } | null
}

export function WarmupStatus() {
  const [status, setStatus] = useState<WarmupStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/warmup')
      .then(res => res.json())
      .then(data => {
        setStatus(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Warm-up Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const progressPercent = status.dailyLimit 
    ? Math.min(100, (status.sentToday / status.dailyLimit) * 100)
    : 0

  const dayProgressPercent = (status.currentDay / status.totalDays) * 100

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Warm-up Status
          </CardTitle>
          {status.isComplete ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Abgeschlossen
            </Badge>
          ) : status.enabled ? (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {status.currentDay}/{status.totalDays} Sende-Tage
            </Badge>
          ) : (
            <Badge variant="outline">Deaktiviert</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.isComplete ? (
          <p className="text-sm text-muted-foreground">
            Warm-up abgeschlossen! Du kannst jetzt unbegrenzt E-Mails senden.
          </p>
        ) : status.enabled ? (
          <>
            {/* Heute gesendet */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Heute gesendet</span>
                <span className="font-medium">
                  {status.sentToday} / {status.dailyLimit ?? '∞'}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              {status.remaining !== null && status.remaining > 0 && (
                <p className="text-xs text-muted-foreground">
                  Noch {status.remaining} E-Mails verfügbar
                </p>
              )}
              {status.remaining === 0 && (
                <p className="text-xs text-orange-600">
                  Tageslimit erreicht - Fortsetzung morgen
                </p>
              )}
            </div>

            {/* Gesamtfortschritt */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gesamtfortschritt</span>
                <span className="font-medium">
                  {Math.round(dayProgressPercent)}%
                </span>
              </div>
              <Progress value={dayProgressPercent} className="h-2" />
            </div>

            {/* Nächste Erhöhung */}
            {status.nextLimitIncrease && (
              <p className="text-xs text-muted-foreground">
                {status.nextLimitIncrease.newLimit === -1 ? (
                  <>Noch {status.nextLimitIncrease.inDays} Sende-Tage bis: Unbegrenzt</>
                ) : (
                  <>
                    Noch {status.nextLimitIncrease.inDays} Sende-Tage bis: {status.nextLimitIncrease.newLimit}/Tag
                  </>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Warm-up ist deaktiviert. Aktiviere es in den Einstellungen für bessere Zustellbarkeit.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
