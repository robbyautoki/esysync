import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const createLeadSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  customFields: z.record(z.string()).optional(),
  sequenceId: z.string().optional(),
  segmentId: z.string().optional().nullable()
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number(searchParams.get('page')) || 1
  const limit = Number(searchParams.get('limit')) || 20
  const search = searchParams.get('search')
  const status = searchParams.get('status')
  const sort = searchParams.get('sort') || 'createdAt'
  const order = searchParams.get('order') || 'desc'

  const where: any = {}

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } }
    ]
  }

  if (status && status !== 'all') {
    where.status = status
  }

  // Build orderBy
  const orderBy: any = {}
  if (sort === 'score') {
    orderBy.score = order
  } else if (sort === 'email') {
    orderBy.email = order
  } else if (sort === 'firstName') {
    orderBy.firstName = order
  } else {
    orderBy.createdAt = order
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            events: true,
            sequenceStates: true
          }
        }
      }
    }),
    db.lead.count({ where })
  ])

  return NextResponse.json({
    leads,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createLeadSchema.parse(body)

    // Check for duplicate
    const existing = await db.lead.findUnique({
      where: { email: data.email }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'duplicate', message: 'E-Mail-Adresse existiert bereits' },
        { status: 409 }
      )
    }

    const lead = await db.lead.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        customFields: data.customFields
      }
    })

    // If sequenceId provided, add to sequence
    if (data.sequenceId) {
      const sequence = await db.sequence.findUnique({
        where: { id: data.sequenceId }
      })

      if (sequence) {
        await db.sequenceState.create({
          data: {
            leadId: lead.id,
            sequenceId: data.sequenceId,
            status: 'ACTIVE'
          }
        })
      }
    }

    // If segmentId provided, add to segment
    if (data.segmentId) {
      const segment = await db.segment.findUnique({
        where: { id: data.segmentId }
      })

      if (segment) {
        await db.leadSegment.create({
          data: {
            leadId: lead.id,
            segmentId: data.segmentId
          }
        })
      }
    }

    return NextResponse.json({ success: true, lead }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
