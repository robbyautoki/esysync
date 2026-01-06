import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Mail, 
  MousePointerClick, 
  Eye, 
  AlertTriangle, 
  LogOut,
  Clock,
  Send,
  Info
} from 'lucide-react'
import { formatDate, formatRelativeDate } from '@/lib/utils'
import Link from 'next/link'

const statusConfig = {
  ACTIVE: { label: 'Aktiv', variant: 'success' as const, description: 'Lead erhält E-Mails' },
  UNSUBSCRIBED: { label: 'Abgemeldet', variant: 'secondary' as const, description: 'Lead hat sich abgemeldet' },
  BOUNCED: { label: 'Bounced', variant: 'destructive' as const, description: 'E-Mails kommen nicht an' }
}

const eventConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  EMAIL_SENT: { label: 'E-Mail gesendet', icon: Send, color: 'text-blue-500' },
  EMAIL_OPENED: { label: 'E-Mail geöffnet', icon: Eye, color: 'text-green-500' },
  EMAIL_CLICKED: { label: 'Link geklickt', icon: MousePointerClick, color: 'text-purple-500' },
  EMAIL_BOUNCED: { label: 'E-Mail gebounced', icon: AlertTriangle, color: 'text-red-500' },
  UNSUBSCRIBED: { label: 'Abgemeldet', icon: LogOut, color: 'text-orange-500' }
}

async function getLead(id: string) {
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { createdAt: 'desc' }
      },
      sequenceStates: {
        include: {
          sequence: {
            include: {
              steps: true
            }
          }
        }
      }
    }
  })

  return lead
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id)

  if (!lead) {
    notFound()
  }

  const status = statusConfig[lead.status]
  const customFields = lead.customFields as Record<string, string> | null

  // Calculate stats
  const emailsSent = lead.events.filter(e => e.type === 'EMAIL_SENT').length
  const emailsOpened = lead.events.filter(e => e.type === 'EMAIL_OPENED').length
  const emailsClicked = lead.events.filter(e => e.type === 'EMAIL_CLICKED').length
  const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0
  const clickRate = emailsOpened > 0 ? Math.round((emailsClicked / emailsOpened) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{lead.firstName}</h1>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TooltipTrigger>
              <TooltipContent>{status.description}</TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground">{lead.email}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/leads">Zurück zur Liste</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  E-Mails gesendet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailsSent}</div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Anzahl aller an diesen Lead gesendeten E-Mails</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Geöffnet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailsOpened}</div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Anzahl der geöffneten E-Mails</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Öffnungsrate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openRate}%</div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Prozentsatz der geöffneten E-Mails</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Klickrate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clickRate}%</div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Prozentsatz der E-Mails mit geklickten Links</TooltipContent>
        </Tooltip>
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Aktivität</TabsTrigger>
          <TabsTrigger value="sequences">Sequenzen</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event-Historie</CardTitle>
              <CardDescription>Alle Aktivitäten dieses Leads</CardDescription>
            </CardHeader>
            <CardContent>
              {lead.events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Noch keine Aktivitäten</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {lead.events.map((event) => {
                      const config = eventConfig[event.type]
                      const Icon = config?.icon || Mail
                      const metadata = event.metadata as Record<string, string> | null

                      return (
                        <div key={event.id} className="relative pl-10">
                          <div className={`absolute left-2 p-1 rounded-full bg-background border ${config?.color || 'text-muted-foreground'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {config?.label || event.type}
                              </p>
                              {metadata?.subject && (
                                <p className="text-sm text-muted-foreground">
                                  Betreff: {metadata.subject}
                                </p>
                              )}
                              {metadata?.url && (
                                <p className="text-sm text-muted-foreground truncate max-w-md">
                                  URL: {metadata.url}
                                </p>
                              )}
                            </div>
                            <Tooltip>
                              <TooltipTrigger className="text-xs text-muted-foreground">
                                {formatRelativeDate(event.createdAt)}
                              </TooltipTrigger>
                              <TooltipContent>
                                {formatDate(event.createdAt)}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sequences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aktive Sequenzen</CardTitle>
              <CardDescription>Sequenzen in denen dieser Lead enthalten ist</CardDescription>
            </CardHeader>
            <CardContent>
              {lead.sequenceStates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>In keiner Sequenz enthalten</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Zu Sequenz hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {lead.sequenceStates.map((state) => (
                    <div key={state.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Link 
                          href={`/sequences/${state.sequence.id}`}
                          className="font-medium hover:underline"
                        >
                          {state.sequence.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          Step {state.currentStepIndex + 1} von {state.sequence.steps.length}
                        </p>
                      </div>
                      <Badge variant={
                        state.status === 'ACTIVE' ? 'success' :
                        state.status === 'COMPLETED' ? 'secondary' :
                        'destructive'
                      }>
                        {state.status === 'ACTIVE' ? 'Aktiv' :
                         state.status === 'COMPLETED' ? 'Abgeschlossen' :
                         state.status === 'STOPPED_BOUNCE' ? 'Gestoppt (Bounce)' :
                         'Abgemeldet'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead-Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">E-Mail</Label>
                  <p className="font-medium">{lead.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vorname</Label>
                  <p className="font-medium">{lead.firstName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Erstellt am</Label>
                  <p className="font-medium">{formatDate(lead.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Aktualisiert am</Label>
                  <p className="font-medium">{formatDate(lead.updatedAt)}</p>
                </div>
              </div>

              {customFields && Object.keys(customFields).length > 0 && (
                <>
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-medium">Custom Fields</h4>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Zusätzliche Felder die beim Import hinzugefügt wurden
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {Object.entries(customFields).map(([key, value]) => (
                        <div key={key}>
                          <Label className="text-muted-foreground">{key}</Label>
                          <p className="font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={`text-sm ${className}`}>{children}</p>
}
