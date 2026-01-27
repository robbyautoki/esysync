'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Eye, MousePointerClick, AlertTriangle, UserMinus } from 'lucide-react'

interface SequenceAnalyticsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sequence: {
    id: string
    name: string
  } | null
}

interface TrackingStats {
  totalSent: number
  uniqueOpens: number
  uniqueClicks: number
  openRate: number
  clickRate: number
  bounces: number
  unsubscribes: number
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
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader className="mb-6">
          <SheetTitle>{sequence?.name} - Analytics</SheetTitle>
          <SheetDescription>
            Performance-Übersicht dieser E-Mail-Sequenz
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <LoadingSkeleton />
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              title="Gesendet"
              value={stats.totalSent}
              icon={Send}
              description="Unique Leads"
            />
            <StatCard
              title="Öffnungsrate"
              value={`${stats.openRate}%`}
              icon={Eye}
              description={`${stats.uniqueOpens} Öffnungen`}
            />
            <StatCard
              title="Klickrate"
              value={`${stats.clickRate}%`}
              icon={MousePointerClick}
              description={`${stats.uniqueClicks} Klicks`}
            />
            <StatCard
              title="Bounces"
              value={stats.bounces}
              icon={AlertTriangle}
              description="Fehlgeschlagene Zustellungen"
            />
            <StatCard
              title="Abmeldungen"
              value={stats.unsubscribes}
              icon={UserMinus}
              description="Aus dieser Sequenz"
            />
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Keine Daten verfügbar
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
