import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSequenceSchema = z.object({
  name: z.string().min(1).optional(),
  trigger: z.enum(['ON_IMPORT', 'MANUAL', 'API_WEBHOOK']).optional(),
  isActive: z.boolean().optional(),
  trackOpens: z.boolean().optional(),
  trackClicks: z.boolean().optional(),
  sendTime: z.string().nullable().optional(),
  scheduledStartAt: z.string().datetime().nullable().optional()
    .transform(val => val ? new Date(val) : val === null ? null : undefined),
  steps: z.array(z.object({
    id: z.string(),
    type: z.enum(['EMAIL', 'DELAY']),
    order: z.number(),
    subject: z.string().nullable().optional(),
    content: z.any().optional(),
    delayValue: z.number().nullable().optional(),
    delayUnit: z.string().nullable().optional()
  })).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sequence = await db.sequence.findUnique({
    where: { id: params.id },
    include: {
      steps: {
        orderBy: { order: 'asc' }
      },
      states: {
        include: {
          lead: true
        }
      }
    }
  })

  if (!sequence) {
    return NextResponse.json(
      { error: 'not_found', message: 'Sequenz nicht gefunden' },
      { status: 404 }
    )
  }

  return NextResponse.json(sequence)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = updateSequenceSchema.parse(body)

    // Update sequence
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.trigger !== undefined) updateData.trigger = data.trigger
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.trackOpens !== undefined) updateData.trackOpens = data.trackOpens
    if (data.trackClicks !== undefined) updateData.trackClicks = data.trackClicks
    if (data.sendTime !== undefined) updateData.sendTime = data.sendTime
    if (data.scheduledStartAt !== undefined) updateData.scheduledStartAt = data.scheduledStartAt

    const sequence = await db.sequence.update({
      where: { id: params.id },
      data: updateData
    })

    // Update steps if provided
    if (data.steps) {
      for (const step of data.steps) {
        if (step.id.startsWith('temp-')) continue // Skip temp IDs
        
        await db.sequenceStep.update({
          where: { id: step.id },
          data: {
            order: step.order,
            subject: step.subject,
            content: step.content,
            delayValue: step.delayValue,
            delayUnit: step.delayUnit
          }
        })
      }
    }

    return NextResponse.json(sequence)
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
  { params }: { params: { id: string } }
) {
  try {
    await db.sequence.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Sequenz konnte nicht gelöscht werden' },
      { status: 500 }
    )
  }
}
