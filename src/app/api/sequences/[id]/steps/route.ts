import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const createStepSchema = z.object({
  type: z.enum(['EMAIL', 'DELAY', 'TAG', 'SEGMENT', 'CONDITION']),
  order: z.number(),
  subject: z.string().nullable().optional(),
  content: z.any().optional(),
  delayValue: z.number().nullable().optional(),
  delayUnit: z.string().nullable().optional(),
  tagAction: z.string().nullable().optional(),
  tagValue: z.string().nullable().optional(),
  targetSegmentId: z.string().nullable().optional(),
  conditionType: z.string().nullable().optional(),
  conditionValue: z.string().nullable().optional(),
  trueSteps: z.any().nullable().optional(),
  falseSteps: z.any().nullable().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = createStepSchema.parse(body)

    const step = await db.sequenceStep.create({
      data: {
        sequenceId: params.id,
        type: data.type,
        order: data.order,
        subject: data.subject,
        content: data.content,
        delayValue: data.delayValue,
        delayUnit: data.delayUnit,
        tagAction: data.tagAction,
        tagValue: data.tagValue,
        targetSegmentId: data.targetSegmentId,
        conditionType: data.conditionType,
        conditionValue: data.conditionValue,
        trueSteps: data.trueSteps,
        falseSteps: data.falseSteps
      }
    })

    return NextResponse.json({ success: true, step }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating step:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
