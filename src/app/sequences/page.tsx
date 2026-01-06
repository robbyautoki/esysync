import { Suspense } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Mail, Play, Pause, MoreHorizontal, Trash2, Edit, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelativeDate } from '@/lib/utils'
import { SequenceActions } from '@/components/sequences/sequence-actions'

async function getSequences() {
  return db.sequence.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      steps: true,
      _count: {
        select: { states: true }
      }
    }
  })
}

const triggerLabels: Record<string, string> = {
  ON_IMPORT: 'Bei Import',
  MANUAL: 'Manuell',
  API_WEBHOOK: 'API/Webhook'
}

function SequencesLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
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
  const sequences = await getSequences()

  if (sequences.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sequences.map((sequence) => {
        const emailSteps = sequence.steps.filter(s => s.type === 'EMAIL').length
        
        return (
          <Card key={sequence.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    <Link href={`/sequences/${sequence.id}`} className="hover:underline">
                      {sequence.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant={sequence.isActive ? 'success' : 'secondary'}>
                          {sequence.isActive ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {sequence.isActive 
                          ? 'Neue Leads durchlaufen diese Sequenz' 
                          : 'Sequenz ist pausiert'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline">{triggerLabels[sequence.trigger]}</Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Trigger-Typ: Wann wird die Sequenz gestartet
                      </TooltipContent>
                    </Tooltip>
                  </CardDescription>
                </div>
                <SequenceActions sequence={sequence} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {emailSteps} E-Mail{emailSteps !== 1 ? 's' : ''}
                  </TooltipTrigger>
                  <TooltipContent>Anzahl der E-Mail-Steps in dieser Sequenz</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {sequence._count.states} Lead{sequence._count.states !== 1 ? 's' : ''}
                  </TooltipTrigger>
                  <TooltipContent>Anzahl der Leads in dieser Sequenz</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Erstellt {formatRelativeDate(sequence.createdAt)}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
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
