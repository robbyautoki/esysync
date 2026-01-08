import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT - Reset lead in sequence
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; leadId: string } }
) {
  try {
    const state = await db.sequenceState.findUnique({
      where: {
        leadId_sequenceId: {
          leadId: params.leadId,
          sequenceId: params.id
        }
      }
    })

    if (!state) {
      return NextResponse.json({ error: 'Lead not in sequence' }, { status: 404 })
    }

    // Reset to beginning
    await db.sequenceState.update({
      where: {
        leadId_sequenceId: {
          leadId: params.leadId,
          sequenceId: params.id
        }
      },
      data: {
        currentStepIndex: 0,
        status: 'ACTIVE',
        nextRunAt: new Date(),
        completedAt: null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting lead:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a single lead from sequence
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; leadId: string } }
) {
  try {
    const state = await db.sequenceState.findUnique({
      where: {
        leadId_sequenceId: {
          leadId: params.leadId,
          sequenceId: params.id
        }
      }
    })

    if (!state) {
      return NextResponse.json({ error: 'Lead not in sequence' }, { status: 404 })
    }

    await db.sequenceState.delete({
      where: {
        leadId_sequenceId: {
          leadId: params.leadId,
          sequenceId: params.id
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing lead from sequence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
