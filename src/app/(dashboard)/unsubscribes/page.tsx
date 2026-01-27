import { Suspense } from 'react'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UnsubscribeTable } from '@/components/unsubscribes/unsubscribe-table'
import { UserMinus } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SearchParams {
  page?: string
  reason?: string
  time?: string
}

const ITEMS_PER_PAGE = 20

async function getUnsubscribeEvents(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1')
  const reason = searchParams.reason
  const time = searchParams.time

  // Build where clause
  const where: any = {
    type: 'UNSUBSCRIBED'
  }

  // Time filter
  if (time) {
    const now = new Date()
    let startDate: Date

    switch (time) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(0)
    }

    where.createdAt = { gte: startDate }
  }

  // Reason filter (JSON field filtering)
  if (reason && reason !== 'none') {
    where.metadata = {
      path: ['reason'],
      equals: reason
    }
  } else if (reason === 'none') {
    // Filter for events without feedback
    where.OR = [
      { metadata: { equals: null } },
      { metadata: { path: ['reason'], equals: null } }
    ]
  }

  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            email: true,
            firstName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE
    }),
    db.event.count({ where })
  ])

  // Cast metadata to the expected type for the client component
  const typedEvents = events.map(event => ({
    ...event,
    metadata: event.metadata as Record<string, unknown> | null
  }))

  return {
    events: typedEvents,
    total,
    page,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE)
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="border rounded-lg">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <UserMinus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Keine Abmeldungen</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Noch keine Leads haben sich von deinem Newsletter abgemeldet.
        </p>
      </CardContent>
    </Card>
  )
}

async function UnsubscribesList({ searchParams }: { searchParams: SearchParams }) {
  const { events, total, page, totalPages } = await getUnsubscribeEvents(searchParams)

  if (events.length === 0 && page === 1 && !searchParams.reason && !searchParams.time) {
    return <EmptyState />
  }

  return (
    <UnsubscribeTable
      events={events}
      total={total}
      page={page}
      totalPages={totalPages}
    />
  )
}

export default async function UnsubscribesPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Abmeldungen</h1>
        <p className="text-muted-foreground">
          Übersicht aller Newsletter-Abmeldungen mit Feedback
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <UnsubscribesList searchParams={params} />
      </Suspense>
    </div>
  )
}
