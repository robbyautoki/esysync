import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const startSequenceSchema = z.object({
  leadIds: z.array(z.string()).min(1)
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { leadIds } = startSequenceSchema.parse(body)

    // Check if sequence exists
    const sequence = await db.sequence.findUnique({
      where: { id: params.id },
      include: { steps: { orderBy: { order: 'asc' } } }
    })

    if (!sequence) {
      return NextResponse.json(
        { error: 'not_found', message: 'Sequenz nicht gefunden' },
        { status: 404 }
      )
    }

    // Check which leads are already in this sequence
    const existingStates = await db.sequenceState.findMany({
      where: {
        sequenceId: params.id,
        leadId: { in: leadIds }
      },
      select: { leadId: true }
    })

    const existingLeadIds = new Set(existingStates.map(s => s.leadId))
    
    // Check for unsubscribed leads
    const unsubscribedLeads = await db.lead.findMany({
      where: {
        id: { in: leadIds },
        status: 'UNSUBSCRIBED'
      },
      select: { id: true }
    })
    const unsubscribedIds = new Set(unsubscribedLeads.map(l => l.id))
    
    const newLeadIds = leadIds.filter(id => !existingLeadIds.has(id) && !unsubscribedIds.has(id))

    // Calculate next run time based on first step
    let nextRunAt = new Date()
    const firstStep = sequence.steps[0]
    
    if (firstStep?.type === 'DELAY') {
      const delayMs = getDelayMs(firstStep.delayValue || 1, firstStep.delayUnit || 'days')
      nextRunAt = new Date(Date.now() + delayMs)
    }

    // Add leads to sequence
    let added = 0
    for (const leadId of newLeadIds) {
      try {
        await db.sequenceState.create({
          data: {
            leadId,
            sequenceId: params.id,
            status: 'ACTIVE',
            currentStepIndex: 0,
            nextRunAt
          }
        })
        added++
      } catch (error) {
        // Skip if lead doesn't exist or other error
        console.error(`Error adding lead ${leadId} to sequence:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      added,
      skipped: existingLeadIds.size,
      unsubscribed: unsubscribedIds.size
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Start sequence error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

function getDelayMs(value: number, unit: string): number {
  switch (unit) {
    case 'minutes':
      return value * 60 * 1000
    case 'hours':
      return value * 60 * 60 * 1000
    case 'days':
      return value * 24 * 60 * 60 * 1000
    default:
      return value * 24 * 60 * 60 * 1000
  }
}
