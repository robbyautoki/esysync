import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all leads in a sequence
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const states = await db.sequenceState.findMany({
      where: { sequenceId: params.id },
      include: {
        lead: true,
        sequence: {
          include: {
            steps: { orderBy: { order: 'asc' } }
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    const leads = states.map(state => ({
      id: state.lead.id,
      email: state.lead.email,
      firstName: state.lead.firstName,
      status: state.status,
      currentStep: state.currentStepIndex + 1,
      totalSteps: state.sequence.steps.length,
      startedAt: state.startedAt,
      nextRunAt: state.nextRunAt,
      completedAt: state.completedAt
    }))

    return NextResponse.json(leads)
  } catch (error) {
    console.error('Error fetching sequence leads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove leads from sequence (bulk)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { leadIds } = body

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array required' }, { status: 400 })
    }

    // Delete sequence states
    const result = await db.sequenceState.deleteMany({
      where: {
        sequenceId: params.id,
        leadId: { in: leadIds }
      }
    })

    return NextResponse.json({ 
      success: true, 
      removed: result.count 
    })
  } catch (error) {
    console.error('Error removing leads from sequence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
