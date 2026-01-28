'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  Mail, 
  Eye, 
  MousePointerClick, 
  Send, 
  UserPlus,
  UserMinus,
  AlertCircle,
  CheckCircle2,
  Circle,
  Pause,
  Tag
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { de } from 'date-fns/locale'

interface LeadHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string | null
}

interface LeadHistory {
  lead: {
    id: string
    email: string
    firstName: string
    status: string
    createdAt: string
  }
  engagement: {
    emailsSent: number
    emailsOpened: number
    emailsClicked: number
    openRate: number
    clickRate: number
    score: number
    label: string
  }
  sequences: Array<{
    id: string
    name: string
    color: string | null
    currentStep: number
    totalSteps: number
    status: string
    startedAt: string
    completedAt: string | null
  }>
  segments: Array<{
    id: string
    name: string
    color: string | null
  }>
  timeline: Array<{
    id: string
    type: string
    createdAt: string
    subject?: string
    sequenceName?: string
    stepIndex?: number
    url?: string
    linkText?: string
  }>
}

const eventIcons: Record<string, typeof Mail> = {
  EMAIL_SENT: Send,
  EMAIL_OPENED: Eye,
  EMAIL_CLICKED: MousePointerClick,
  EMAIL_BOUNCED: AlertCircle,
  UNSUBSCRIBED: UserMinus,
}

const eventLabels: Record<string, string> = {
  EMAIL_SENT: 'E-Mail gesendet',
  EMAIL_OPENED: 'E-Mail geöffnet',
  EMAIL_CLICKED: 'Link geklickt',
  EMAIL_BOUNCED: 'E-Mail gebounced',
  UNSUBSCRIBED: 'Abgemeldet',
}

const statusIcons: Record<string, typeof Circle> = {
  ACTIVE: Circle,
  COMPLETED: CheckCircle2,
  STOPPED_BOUNCE: AlertCircle,
  UNSUBSCRIBED: UserMinus,
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Aktiv',
  COMPLETED: 'Fertig',
  STOPPED_BOUNCE: 'Bounce',
  UNSUBSCRIBED: 'Abgemeldet',
}

function EngagementBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    'Sehr gut': 'bg-green-100 text-green-700',
    'Gut': 'bg-blue-100 text-blue-700',
    'Niedrig': 'bg-yellow-100 text-yellow-700',
    'Kein': 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[label] || colors['Kein']}`}>
      {label}
    </span>
  )
}

export function LeadHistorySheet({ open, onOpenChange, leadId }: LeadHistorySheetProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<LeadHistory | null>(null)

  useEffect(() => {
    if (open && leadId) {
      setLoading(true)
      fetch(`/api/leads/${leadId}/history`)
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setData(result)
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open, leadId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px] p-0">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="text-base">Lead History</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : data ? (
          <ScrollArea className="h-[calc(100vh-60px)]">
            <div className="p-4 space-y-6">
              {/* Header */}
              <div>
                <h3 className="font-semibold text-lg">{data.lead.firstName}</h3>
                <p className="text-sm text-muted-foreground">{data.lead.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lead seit {format(new Date(data.lead.createdAt), 'dd.MM.yyyy', { locale: de })}
                </p>
                {data.lead.status === 'UNSUBSCRIBED' && (
                  <Badge variant="destructive" className="mt-2 text-xs">
                    Abgemeldet
                  </Badge>
                )}
                {data.lead.status === 'BOUNCED' && (
                  <Badge variant="destructive" className="mt-2 text-xs">
                    Bounced
                  </Badge>
                )}
              </div>

              {/* Engagement */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Engagement</span>
                  <EngagementBadge label={data.engagement.label} />
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="text-xs">Erhalten</span>
                    </div>
                    <p className="font-semibold">{data.engagement.emailsSent}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      <span className="text-xs">Geöffnet</span>
                    </div>
                    <p className="font-semibold">{data.engagement.emailsOpened}</p>
                    <p className="text-xs text-muted-foreground">{data.engagement.openRate}%</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <MousePointerClick className="h-3 w-3" />
                      <span className="text-xs">Geklickt</span>
                    </div>
                    <p className="font-semibold">{data.engagement.emailsClicked}</p>
                    <p className="text-xs text-muted-foreground">{data.engagement.clickRate}%</p>
                  </div>
                </div>

                <Progress value={data.engagement.score} className="h-1.5" />
              </div>

              {/* Sequenzen */}
              {data.sequences.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Sequenzen
                  </h4>
                  <div className="space-y-2">
                    {data.sequences.map(seq => {
                      const StatusIcon = statusIcons[seq.status] || Circle
                      const statusColor = seq.status === 'COMPLETED' ? 'text-green-600' :
                                         seq.status === 'ACTIVE' ? 'text-blue-600' :
                                         'text-muted-foreground'
                      return (
                        <div 
                          key={seq.id}
                          className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50"
                        >
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: seq.color || '#a1a1aa' }}
                          />
                          <span className="text-sm flex-1 truncate">{seq.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {seq.currentStep}/{seq.totalSteps}
                          </span>
                          <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Segmente */}
              {data.segments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Segmente
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {data.segments.map(seg => (
                      <Badge 
                        key={seg.id} 
                        variant="outline"
                        className="text-xs"
                        style={{ 
                          borderColor: seg.color || undefined,
                          backgroundColor: seg.color ? `${seg.color}15` : undefined
                        }}
                      >
                        {seg.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h4 className="text-sm font-medium mb-2">Timeline</h4>
                {data.timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Events vorhanden</p>
                ) : (
                  <div className="space-y-1">
                    {data.timeline.map(event => {
                      const Icon = eventIcons[event.type] || Mail
                      const label = eventLabels[event.type] || event.type
                      
                      return (
                        <div 
                          key={event.id}
                          className="flex gap-3 py-2 border-l-2 border-muted pl-3 ml-1.5 hover:bg-muted/30 rounded-r"
                        >
                          <div className="flex-shrink-0 -ml-[19px] bg-background p-1 rounded-full border">
                            <Icon className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{label}</p>
                            {event.subject && (
                              <p className="text-xs text-muted-foreground truncate">
                                "{event.subject}"
                              </p>
                            )}
                            {event.url && (
                              <p className="text-xs text-muted-foreground truncate">
                                {event.linkText || event.url}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(event.createdAt), { 
                              addSuffix: true, 
                              locale: de 
                            })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            Lead auswählen um History zu sehen
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
