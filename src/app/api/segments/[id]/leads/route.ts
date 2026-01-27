import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: { id: string }
}

// POST /api/segments/[id]/leads - Leads zu Segment hinzufügen
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { leadIds } = body

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'leadIds Array ist erforderlich' },
        { status: 400 }
      )
    }

    // Prüfe ob Segment existiert
    const segment = await db.segment.findUnique({
      where: { id: params.id }
    })

    if (!segment) {
      return NextResponse.json(
        { success: false, error: 'Segment nicht gefunden' },
        { status: 404 }
      )
    }

    // Prüfe welche Leads existieren
    const existingLeads = await db.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true }
    })
    const existingLeadIds = existingLeads.map(l => l.id)

    // Prüfe welche Zuordnungen bereits existieren
    const existingAssignments = await db.leadSegment.findMany({
      where: {
        segmentId: params.id,
        leadId: { in: existingLeadIds }
      },
      select: { leadId: true }
    })
    const alreadyAssigned = new Set(existingAssignments.map(a => a.leadId))

    // Nur neue Zuordnungen erstellen
    const newLeadIds = existingLeadIds.filter(id => !alreadyAssigned.has(id))

    if (newLeadIds.length > 0) {
      await db.leadSegment.createMany({
        data: newLeadIds.map(leadId => ({
          leadId,
          segmentId: params.id
        }))
      })
    }

    return NextResponse.json({
      success: true,
      added: newLeadIds.length,
      skipped: alreadyAssigned.size,
      notFound: leadIds.length - existingLeadIds.length
    })
  } catch (error) {
    console.error('Fehler beim Hinzufügen zu Segment:', error)
    return NextResponse.json(
      { success: false, error: 'Leads konnten nicht hinzugefügt werden' },
      { status: 500 }
    )
  }
}

// DELETE /api/segments/[id]/leads - Leads aus Segment entfernen
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { leadIds } = body

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'leadIds Array ist erforderlich' },
        { status: 400 }
      )
    }

    // Prüfe ob Segment existiert
    const segment = await db.segment.findUnique({
      where: { id: params.id }
    })

    if (!segment) {
      return NextResponse.json(
        { success: false, error: 'Segment nicht gefunden' },
        { status: 404 }
      )
    }

    const result = await db.leadSegment.deleteMany({
      where: {
        segmentId: params.id,
        leadId: { in: leadIds }
      }
    })

    return NextResponse.json({
      success: true,
      removed: result.count
    })
  } catch (error) {
    console.error('Fehler beim Entfernen aus Segment:', error)
    return NextResponse.json(
      { success: false, error: 'Leads konnten nicht entfernt werden' },
      { status: 500 }
    )
  }
}
