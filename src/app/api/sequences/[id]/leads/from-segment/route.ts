import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: { id: string }
}

// POST /api/sequences/[id]/leads/from-segment - Alle Leads eines Segments zur Sequenz hinzufügen
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { segmentId } = body

    if (!segmentId) {
      return NextResponse.json(
        { success: false, error: 'segmentId ist erforderlich' },
        { status: 400 }
      )
    }

    // Prüfe ob Sequenz existiert
    const sequence = await db.sequence.findUnique({
      where: { id: params.id }
    })

    if (!sequence) {
      return NextResponse.json(
        { success: false, error: 'Sequenz nicht gefunden' },
        { status: 404 }
      )
    }

    // Prüfe ob Segment existiert
    const segment = await db.segment.findUnique({
      where: { id: segmentId }
    })

    if (!segment) {
      return NextResponse.json(
        { success: false, error: 'Segment nicht gefunden' },
        { status: 404 }
      )
    }

    // Hole alle aktiven Leads des Segments (nicht UNSUBSCRIBED)
    const segmentLeads = await db.leadSegment.findMany({
      where: { segmentId },
      include: {
        lead: {
          select: { id: true, status: true }
        }
      }
    })

    const activeLeadIds = segmentLeads
      .filter(ls => ls.lead.status !== 'UNSUBSCRIBED')
      .map(ls => ls.leadId)

    if (activeLeadIds.length === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        skipped: 0,
        inactive: segmentLeads.length
      })
    }

    // Prüfe welche Leads bereits in der Sequenz sind
    const existingStates = await db.sequenceState.findMany({
      where: {
        sequenceId: params.id,
        leadId: { in: activeLeadIds }
      },
      select: { leadId: true }
    })
    const alreadyInSequence = new Set(existingStates.map(s => s.leadId))

    // Nur neue Leads zur Sequenz hinzufügen
    const newLeadIds = activeLeadIds.filter(id => !alreadyInSequence.has(id))

    if (newLeadIds.length > 0) {
      const now = new Date()
      await db.sequenceState.createMany({
        data: newLeadIds.map(leadId => ({
          leadId,
          sequenceId: params.id,
          status: 'ACTIVE',
          nextRunAt: now
        }))
      })
    }

    return NextResponse.json({
      success: true,
      added: newLeadIds.length,
      skipped: alreadyInSequence.size,
      inactive: segmentLeads.length - activeLeadIds.length
    })
  } catch (error) {
    console.error('Fehler beim Hinzufügen von Segment-Leads:', error)
    return NextResponse.json(
      { success: false, error: 'Leads konnten nicht hinzugefügt werden' },
      { status: 500 }
    )
  }
}
