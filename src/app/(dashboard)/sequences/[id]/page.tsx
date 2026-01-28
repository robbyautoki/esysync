import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { SequenceEditor } from '@/components/sequences/sequence-editor'

async function getSequence(id: string) {
  return db.sequence.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { order: 'asc' }
      },
      _count: {
        select: { states: true }
      }
    }
  })
}

export default async function SequenceEditorPage({ params }: { params: { id: string } }) {
  const sequence = await getSequence(params.id)

  if (!sequence) {
    notFound()
  }

  // Serialize Date objects to ISO strings for client component
  const serializedSequence = {
    ...sequence,
    scheduledStartAt: sequence.scheduledStartAt?.toISOString() ?? null,
    // Cast steps with proper types for client
    steps: sequence.steps.map(step => ({
      ...step,
      falseSteps: step.falseSteps as any[] | null
    }))
  }

  return <SequenceEditor sequence={serializedSequence as any} />
}
