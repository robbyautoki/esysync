'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, Users, Calendar, TrendingUp } from 'lucide-react'

interface PreviewData {
  totalLeads: number
  emailSteps: number
  totalEmails: number
  estimatedDays: number
  scheduledStartAt: string | null
  warmup: {
    dailyLimit: number | null
    isComplete: boolean
  }
}

interface SequencePreviewProps {
  sequenceId: string
}

export function SequencePreview({ sequenceId }: SequencePreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchPreview()
  }, [sequenceId])

  const fetchPreview = async () => {
    try {
      const res = await fetch(`/api/sequences/${sequenceId}/preview`)
      if (res.ok) {
        const data = await res.json()
        setPreview(data.preview)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !preview) {
    return null
  }

  const hasContent = preview.totalLeads > 0 || preview.emailSteps > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Versand-Vorschau</CardTitle>
        </div>
        <CardDescription>
          Geschätzte Zahlen basierend auf aktuellen Leads und Steps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Startdatum */}
        {preview.scheduledStartAt && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-900">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div className="text-sm">
              <span className="text-muted-foreground">Geplanter Start: </span>
              <span className="font-medium">
                {format(new Date(preview.scheduledStartAt), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })}
              </span>
            </div>
          </div>
        )}

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
        {hasContent && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gesamt E-Mails:</span>
              <span className="font-medium">{preview.totalEmails.toLocaleString('de-DE')}</span>
            </div>
            {preview.estimatedDays > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Geschätzte Dauer:</span>
                <span className="font-medium">
                  ~{preview.estimatedDays} {preview.estimatedDays === 1 ? 'Tag' : 'Tage'}
                </span>
              </div>
            )}
            {!preview.warmup.isComplete && preview.warmup.dailyLimit && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tageslimit (Warmup):</span>
                <Badge variant="outline">{preview.warmup.dailyLimit}/Tag</Badge>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!hasContent && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Füge Leads und E-Mail-Steps hinzu, um eine Vorschau zu sehen
          </p>
        )}
      </CardContent>
    </Card>
  )
}
