import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateLeadSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED']).optional(),
  customFields: z.record(z.string()).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const lead = await db.lead.findUnique({
    where: { id: params.id },
    include: {
      events: {
        orderBy: { createdAt: 'desc' },
        take: 50
      },
      sequenceStates: {
        include: {
          sequence: true
        }
      }
    }
  })

  if (!lead) {
    return NextResponse.json(
      { error: 'not_found', message: 'Lead nicht gefunden' },
      { status: 404 }
    )
  }

  return NextResponse.json(lead)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = updateLeadSchema.parse(body)

    // Check if email already exists (if changing email)
    if (data.email) {
      const existing = await db.lead.findFirst({
        where: {
          email: data.email,
          NOT: { id: params.id }
        }
      })

      if (existing) {
        return NextResponse.json(
          { error: 'duplicate', message: 'E-Mail-Adresse existiert bereits' },
          { status: 409 }
        )
      }
    }

    const lead = await db.lead.update({
      where: { id: params.id },
      data
    })

    return NextResponse.json(lead)
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
    await db.lead.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Lead konnte nicht gelöscht werden' },
      { status: 500 }
    )
  }
}
