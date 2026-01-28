import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const createFormSchema = z.object({
  name: z.string().min(1),
  sequenceId: z.string().optional(),
  segmentId: z.string().optional(),
  newSegmentName: z.string().optional(),
  buttonText: z.string().optional(),
  successMessage: z.string().optional()
})

export async function GET() {
  const forms = await db.signupForm.findMany({
    include: {
      sequence: {
        select: { id: true, name: true }
      },
      segment: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(forms)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createFormSchema.parse(body)

    let segmentId = data.segmentId || null

    // Neues Segment erstellen falls gewünscht
    if (data.newSegmentName && data.newSegmentName.trim()) {
      const newSegment = await db.segment.create({
        data: { name: data.newSegmentName.trim() }
      })
      segmentId = newSegment.id
    }

    // Auto-Segment erstellen wenn Sequenz gewählt aber kein Segment
    if (data.sequenceId && !segmentId) {
      const autoSegment = await db.segment.create({
        data: { name: `Form: ${data.name}` }
      })
      segmentId = autoSegment.id
    }

    const form = await db.signupForm.create({
      data: {
        name: data.name,
        sequenceId: data.sequenceId || null,
        segmentId,
        buttonText: data.buttonText || 'Anmelden',
        successMessage: data.successMessage || 'Danke für deine Anmeldung!'
      },
      include: {
        segment: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(form)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Create form error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
