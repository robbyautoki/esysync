'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Send,
  Eye,
  MousePointerClick,
  AlertTriangle,
  UserMinus,
  Users,
  Link as LinkIcon,
  Mail,
  Clock,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

interface SequenceAnalyticsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sequence: {
    id: string
    name: string
  } | null
}

interface StepStat {
  stepIndex: number
  subject: string
  sent: number
  opens: number
  clicks: number
  openRate: number
  clickRate: number
}

interface TimelineEntry {
  date: string
  opens: number
  clicks: number
}

interface TopLink {
  url: string
  clicks: number
}

interface RecentActivity {
  leadId: string
  leadName: string
  type: 'open' | 'click'
  url?: string
  timestamp: string
}

interface TrackingStats {
  totalSent: number
  uniqueOpens: number
  uniqueClicks: number
  openRate: number
  clickRate: number
  bounces: number
  unsubscribes: number
  activeLeads: number
  activeLeadsByStep: Array<{ stepIndex: number; count: number }>
  stepStats: StepStat[]
  timeline: TimelineEntry[]
  topLinks: TopLink[]
  recentActivity: RecentActivity[]
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'gerade eben'
  if (diffMins < 60) return `vor ${diffMins} Min`
  if (diffHours < 24) return `vor ${diffHours} Std`
  if (diffDays < 7) return `vor ${diffDays} Tagen`
  return date.toLocaleDateString('de-DE')
}

function truncateUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength) + '...'
}

export function SequenceAnalyticsSheet({
  open,
  onOpenChange,
  sequence,
}: SequenceAnalyticsSheetProps) {
  const [stats, setStats] = useState<TrackingStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && sequence) {
      setLoading(true)
      fetch(`/api/sequences/${sequence.id}/tracking`)
        .then((res) => res.json())
        .then((data) => {
          setStats(data)
        })
        .catch((err) => {
          console.error('Error fetching tracking stats:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, sequence])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  }

  const chartConfig = {
    opens: {
      label: 'Opens',
      color: 'hsl(var(--chart-1))',
    },
    clicks: {
      label: 'Klicks',
      color: 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader className="mb-4">
          <SheetTitle>{sequence?.name} - Analytics</SheetTitle>
          <SheetDescription>
            Performance-Übersicht dieser E-Mail-Sequenz
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-100px)] pr-4">
          {loading ? (
            <LoadingSkeleton />
          ) : stats ? (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                  title="Gesendet"
                  value={stats.totalSent}
                  icon={Send}
                />
                <StatCard
                  title="Öffnungsrate"
                  value={`${stats.openRate}%`}
                  icon={Eye}
                  description={`${stats.uniqueOpens} Opens`}
                />
                <StatCard
                  title="Klickrate"
                  value={`${stats.clickRate}%`}
                  icon={MousePointerClick}
                  description={`${stats.uniqueClicks} Klicks`}
                />
                <StatCard
                  title="Aktive Leads"
                  value={stats.activeLeads}
                  icon={Users}
                />
                <StatCard
                  title="Bounces"
                  value={stats.bounces}
                  icon={AlertTriangle}
                />
                <StatCard
                  title="Abmeldungen"
                  value={stats.unsubscribes}
                  icon={UserMinus}
                />
              </div>

              {/* Timeline Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    Opens & Klicks (letzte 14 Tage)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-56 w-full">
                    <AreaChart
                      data={stats.timeline}
                      margin={{ left: 12, right: 12 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={formatDate}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Area
                        dataKey="opens"
                        type="natural"
                        fill="var(--color-opens)"
                        fillOpacity={0.4}
                        stroke="var(--color-opens)"
                        stackId="a"
                      />
                      <Area
                        dataKey="clicks"
                        type="natural"
                        fill="var(--color-clicks)"
                        fillOpacity={0.4}
                        stroke="var(--color-clicks)"
                        stackId="b"
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Step Performance */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Performance pro Step
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.stepStats.length > 0 ? (
                      <div className="space-y-3">
                        {stats.stepStats.map((step, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {step.subject}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {step.sent} gesendet
                              </p>
                            </div>
                            <div className="flex gap-2 ml-2">
                              <Badge variant="secondary" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                {step.openRate}%
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                <MousePointerClick className="h-3 w-3 mr-1" />
                                {step.clickRate}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Keine E-Mail-Steps vorhanden
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Letzte Aktivität
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.recentActivity.length > 0 ? (
                      <div className="space-y-2">
                        {stats.recentActivity.slice(0, 8).map((activity, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div
                              className={`p-1.5 rounded-full ${
                                activity.type === 'open'
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-green-100 text-green-600'
                              }`}
                            >
                              {activity.type === 'open' ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <MousePointerClick className="h-3 w-3" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {activity.leadName}
                              </p>
                              {activity.url && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {truncateUrl(activity.url, 30)}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Noch keine Aktivität
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Links */}
              {stats.topLinks.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Top geklickte Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.topLinks.map((link, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <span className="text-sm truncate flex-1 mr-2">
                            {truncateUrl(link.url, 60)}
                          </span>
                          <Badge variant="outline">{link.clicks} Klicks</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Keine Daten verfügbar
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
