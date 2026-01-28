import { Suspense } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Mail } from 'lucide-react'
import { SequencesPageClient } from '@/components/sequences/sequences-page-client'

async function getSequencesAndFolders() {
  const [sequences, folders] = await Promise.all([
    db.sequence.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        steps: {
          select: { type: true }
        },
        folder: {
          select: { id: true, name: true, color: true }
        },
        _count: {
          select: { states: true }
        }
      }
    }),
    db.sequenceFolder.findMany({
      orderBy: { order: 'asc' }
    })
  ])
  return { sequences, folders }
}

function SequencesLoading() {
  return (
    <div className="border rounded-lg">
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
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
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Keine Sequenzen vorhanden</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Erstelle deine erste E-Mail-Sequenz um automatisiert mit deinen Leads zu kommunizieren.
        </p>
        <Button asChild>
          <Link href="/sequences/new">
            <Plus className="mr-2 h-4 w-4" />
            Erste Sequenz erstellen
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

async function SequencesList() {
  const { sequences, folders } = await getSequencesAndFolders()

  if (sequences.length === 0) {
    return <EmptyState />
  }

  return <SequencesPageClient sequences={sequences} folders={folders} />
}

export default function SequencesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sequenzen</h1>
          <p className="text-muted-foreground">
            Erstelle und verwalte automatisierte E-Mail-Sequenzen
          </p>
        </div>
        <Button asChild>
          <Link href="/sequences/new">
            <Plus className="mr-2 h-4 w-4" />
            Neue Sequenz
          </Link>
        </Button>
      </div>

      <Suspense fallback={<SequencesLoading />}>
        <SequencesList />
      </Suspense>
    </div>
  )
}
