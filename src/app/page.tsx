import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Mail, MousePointerClick, TrendingUp } from 'lucide-react'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ManualSendButton } from '@/components/dashboard/manual-send-button'
import { WarmupStatus } from '@/components/dashboard/warmup-status'

async function getStats() {
  const [
    totalLeads,
    activeLeads,
    totalSequences,
    activeSequences,
    recentEvents
  ] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { status: 'ACTIVE' } }),
    db.sequence.count(),
    db.sequence.count({ where: { isActive: true } }),
    db.event.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { lead: true }
    })
  ])

  const emailsSent = await db.event.count({ where: { type: 'EMAIL_SENT' } })
  const emailsOpened = await db.event.count({ where: { type: 'EMAIL_OPENED' } })
  const emailsClicked = await db.event.count({ where: { type: 'EMAIL_CLICKED' } })

  const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0
  const clickRate = emailsOpened > 0 ? Math.round((emailsClicked / emailsOpened) * 100) : 0

  return {
    totalLeads,
    activeLeads,
    totalSequences,
    activeSequences,
    emailsSent,
    openRate,
    clickRate,
    recentEvents
  }
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  tooltip
}: { 
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  tooltip: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="hover:shadow-md transition-shadow cursor-default">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function DashboardStats() {
  const stats = await getStats()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Leads"
        value={stats.totalLeads}
        description={`${stats.activeLeads} aktiv`}
        icon={Users}
        tooltip="Gesamtanzahl aller importierten Leads"
      />
      <StatCard
        title="E-Mails gesendet"
        value={stats.emailsSent}
        icon={Mail}
        tooltip="Anzahl aller gesendeten E-Mails"
      />
      <StatCard
        title="Öffnungsrate"
        value={`${stats.openRate}%`}
        description="der gesendeten E-Mails"
        icon={TrendingUp}
        tooltip="Prozentsatz der E-Mails die geöffnet wurden"
      />
      <StatCard
        title="Klickrate"
        value={`${stats.clickRate}%`}
        description="der geöffneten E-Mails"
        icon={MousePointerClick}
        tooltip="Prozentsatz der geöffneten E-Mails mit Klicks"
      />
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Willkommen bei EsySync</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Starte mit dem Import deiner ersten Leads oder erstelle eine neue E-Mail-Sequenz.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/leads">Leads importieren</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sequences/new">Sequenz erstellen</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

async function RecentActivity() {
  const events = await db.event.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { lead: true }
  })

  if (events.length === 0) {
    return <EmptyState />
  }

  const eventLabels: Record<string, string> = {
    EMAIL_SENT: 'E-Mail gesendet',
    EMAIL_OPENED: 'E-Mail geöffnet',
    EMAIL_CLICKED: 'Link geklickt',
    EMAIL_BOUNCED: 'E-Mail gebounced',
    UNSUBSCRIBED: 'Abgemeldet'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Letzte Aktivitäten</CardTitle>
        <CardDescription>Die neuesten Events deiner Leads</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {event.lead.firstName} ({event.lead.email})
                </p>
                <p className="text-xs text-muted-foreground">
                  {eventLabels[event.type] || event.type}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(event.createdAt).toLocaleDateString('de-DE')}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Übersicht deiner Newsletter-Performance
        </p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <DashboardStats />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <RecentActivity />
        </Suspense>
        
        <div className="space-y-4">
          <WarmupStatus />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>E-Mail Versand</CardTitle>
              <CardDescription>Manuell fällige E-Mails versenden</CardDescription>
            </CardHeader>
            <CardContent>
              <ManualSendButton />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Schnellzugriff</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/leads">
                  <Users className="mr-2 h-4 w-4" />
                  Leads verwalten
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/sequences">
                  <Mail className="mr-2 h-4 w-4" />
                  Sequenzen anzeigen
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/sequences/new">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Neue Sequenz erstellen
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
