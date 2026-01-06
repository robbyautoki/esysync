import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateStepSchema = z.object({
  order: z.number().optional(),
  subject: z.string().nullable().optional(),
  content: z.any().optional(),
  delayValue: z.number().nullable().optional(),
  delayUnit: z.string().nullable().optional()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const body = await request.json()
    const data = updateStepSchema.parse(body)

    const step = await db.sequenceStep.update({
      where: { id: params.stepId },
      data
    })

    return NextResponse.json(step)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Update error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    await db.sequenceStep.delete({
      where: { id: params.stepId }
    })

    // Reorder remaining steps
    const remainingSteps = await db.sequenceStep.findMany({
      where: { sequenceId: params.id },
      orderBy: { order: 'asc' }
    })

    for (let i = 0; i < remainingSteps.length; i++) {
      await db.sequenceStep.update({
        where: { id: remainingSteps[i].id },
        data: { order: i }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Step konnte nicht gelöscht werden' },
      { status: 500 }
    )
  }
}
