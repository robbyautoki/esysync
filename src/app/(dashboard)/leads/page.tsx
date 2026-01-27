import { Suspense } from 'react'
import { LeadTable } from '@/components/leads/lead-table'
import { ImportModal } from '@/components/leads/import-modal'
import { SegmentTabs } from '@/components/leads/segment-tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Upload, Users } from 'lucide-react'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface LeadsPageProps {
  searchParams: {
    page?: string
    search?: string
    status?: string
    sort?: string
    order?: string
    segment?: string
  }
}

async function getSegments() {
  const segments = await db.segment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { leads: true }
      }
    }
  })

  return segments.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    color: s.color,
    leadCount: s._count.leads
  }))
}

async function getLeads(params: LeadsPageProps['searchParams']) {
  const page = Number(params.page) || 1
  const limit = 20
  const skip = (page - 1) * limit

  const where: any = {}

  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: 'insensitive' } },
      { firstName: { contains: params.search, mode: 'insensitive' } }
    ]
  }

  if (params.status && params.status !== 'all') {
    where.status = params.status
  }

  // Segment-Filter
  if (params.segment) {
    where.segments = {
      some: {
        segmentId: params.segment
      }
    }
  }

  const orderBy: any = {}
  if (params.sort) {
    orderBy[params.sort] = params.order || 'asc'
  } else {
    orderBy.createdAt = 'desc'
  }

  const [leads, total, totalAll] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        _count: {
          select: { events: true, sequenceStates: true }
        },
        segments: {
          include: {
            segment: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      }
    }),
    db.lead.count({ where }),
    db.lead.count()
  ])

  return {
    leads,
    total,
    totalAll,
    page,
    totalPages: Math.ceil(total / limit)
  }
}

function LeadsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <Skeleton className="h-4 w-full" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b last:border-b-0">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Keine Leads vorhanden</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Importiere deine ersten Leads per CSV oder füge sie manuell hinzu.
        </p>
        <div className="flex gap-3">
          <ImportModal>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              CSV importieren
            </Button>
          </ImportModal>
          <Button variant="outline" asChild>
            <Link href="/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Lead hinzufügen
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

async function LeadsContent({ searchParams }: LeadsPageProps) {
  const [data, segments] = await Promise.all([
    getLeads(searchParams),
    getSegments()
  ])

  if (data.totalAll === 0 && !searchParams.search && !searchParams.status && !searchParams.segment) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      <SegmentTabs segments={segments} totalLeads={data.totalAll} />
      <LeadTable
        leads={data.leads}
        total={data.total}
        page={data.page}
        totalPages={data.totalPages}
      />
    </div>
  )
}

export default function LeadsPage({ searchParams }: LeadsPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Verwalte deine Kontakte und importiere neue Leads
          </p>
        </div>
        <div className="flex gap-2">
          <ImportModal>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              CSV importieren
            </Button>
          </ImportModal>
          <Button asChild>
            <Link href="/leads/new">
              <Plus className="mr-2 h-4 w-4" />
              Lead hinzufügen
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<LeadsLoading />}>
        <LeadsContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
