import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateApiKey, unauthorizedResponse } from '@/lib/api-auth'
import { z } from 'zod'

const createLeadSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  customFields: z.record(z.string()).optional(),
  sequenceId: z.string().optional()
})

// GET /api/v1/leads - List leads
export async function GET(request: NextRequest) {
  if (!await validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const searchParams = request.nextUrl.searchParams
  const page = Number(searchParams.get('page')) || 1
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
  const status = searchParams.get('status')

  const where: any = {}
  if (status) {
    where.status = status
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        status: true,
        score: true,
        customFields: true,
        createdAt: true
      }
    }),
    db.lead.count({ where })
  ])

  return NextResponse.json({
    data: leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
}

// POST /api/v1/leads - Create lead
export async function POST(request: NextRequest) {
  if (!await validateApiKey(request)) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const data = createLeadSchema.parse(body)

    // Check if email exists
    const existing = await db.lead.findUnique({
      where: { email: data.email.toLowerCase() }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Email already exists', leadId: existing.id },
        { status: 409 }
      )
    }

    // Create lead
    const lead = await db.lead.create({
      data: {
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        customFields: data.customFields
      }
    })

    // Add to sequence if specified
    if (data.sequenceId) {
      await db.sequenceState.create({
        data: {
          leadId: lead.id,
          sequenceId: data.sequenceId,
          status: 'ACTIVE',
          nextRunAt: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: lead.id,
        email: lead.email,
        firstName: lead.firstName
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation', errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Server error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
