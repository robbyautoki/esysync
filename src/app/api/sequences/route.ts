import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const createSequenceSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  trigger: z.enum(['ON_IMPORT', 'MANUAL', 'API_WEBHOOK'])
})

export async function GET() {
  const sequences = await db.sequence.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      steps: {
        orderBy: { order: 'asc' }
      },
      _count: {
        select: { states: true }
      }
    }
  })

  return NextResponse.json({ sequences })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createSequenceSchema.parse(body)

    const sequence = await db.sequence.create({
      data: {
        name: data.name,
        trigger: data.trigger
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
