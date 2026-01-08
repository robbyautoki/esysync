import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateApiKey, unauthorizedResponse } from '@/lib/api-auth'

// GET /api/v1/sequences/:id - Get single sequence
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const sequence = await db.sequence.findUnique({
    where: { id: params.id },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          type: true,
          order: true,
          subject: true,
          delayValue: true,
          delayUnit: true
        }
      },
      _count: {
        select: { states: true }
      }
    }
  })

  if (!sequence) {
    return NextResponse.json(
      { error: 'Not found', message: 'Sequence not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    data: {
      id: sequence.id,
      name: sequence.name,
      trigger: sequence.trigger,
      isActive: sequence.isActive,
      trackOpens: sequence.trackOpens,
      trackClicks: sequence.trackClicks,
      sendTime: sequence.sendTime,
      steps: sequence.steps,
      leadsCount: sequence._count.states,
      createdAt: sequence.createdAt,
      updatedAt: sequence.updatedAt
    }
  })
}

// POST /api/v1/sequences/:id - Add leads to sequence
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await validateApiKey(request)) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { leadIds } = body

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Validation', message: 'leadIds array required' },
        { status: 400 }
      )
    }

    // Check sequence exists
    const sequence = await db.sequence.findUnique({
      where: { id: params.id }
    })

    if (!sequence) {
      return NextResponse.json(
        { error: 'Not found', message: 'Sequence not found' },
        { status: 404 }
      )
    }

    // Check existing states
    const existingStates = await db.sequenceState.findMany({
      where: {
        sequenceId: params.id,
        leadId: { in: leadIds }
      },
      select: { leadId: true }
    })

    // Check unsubscribed leads
    const unsubscribedLeads = await db.lead.findMany({
      where: {
        id: { in: leadIds },
        status: 'UNSUBSCRIBED'
      },
      select: { id: true }
    })

    const existingIds = new Set(existingStates.map(s => s.leadId))
    const unsubscribedIds = new Set(unsubscribedLeads.map(l => l.id))
    
    const newLeadIds = leadIds.filter(
      id => !existingIds.has(id) && !unsubscribedIds.has(id)
    )

    // Add leads
    let added = 0
    for (const leadId of newLeadIds) {
      try {
        await db.sequenceState.create({
          data: {
            leadId,
            sequenceId: params.id,
            status: 'ACTIVE',
            nextRunAt: new Date()
          }
        })
        added++
      } catch {
        // Skip invalid leads
      }
    }

    return NextResponse.json({
      success: true,
      added,
      skipped: existingIds.size,
      unsubscribed: unsubscribedIds.size
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
