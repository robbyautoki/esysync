import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const createSequenceSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  trigger: z.enum(['ON_IMPORT', 'MANUAL', 'API_WEBHOOK']),
  scheduledStartAt: z.string().datetime().optional().nullable()
    .transform(val => val ? new Date(val) : null)
})

export async function GET() {
  const [sequences, folders] = await Promise.all([
    db.sequence.findMany({
      orderBy: [
        { folder: { order: 'asc' } },
        { createdAt: 'desc' }
      ],
      include: {
        steps: {
          orderBy: { order: 'asc' }
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
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { sequences: true }
        }
      }
    })
  ])

  return NextResponse.json({ sequences, folders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createSequenceSchema.parse(body)

    const sequence = await db.sequence.create({
      data: {
        name: data.name,
        trigger: data.trigger,
        scheduledStartAt: data.scheduledStartAt
      }
    })

    return NextResponse.json({ success: true, sequence }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating sequence:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
