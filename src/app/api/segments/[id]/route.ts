import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: { id: string }
}

// GET /api/segments/[id] - Einzelnes Segment mit Leads
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const segment = await db.segment.findUnique({
      where: { id: params.id },
      include: {
        leads: {
          include: {
            lead: {
              select: {
                id: true,
                email: true,
                firstName: true,
                status: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { leads: true }
        }
      }
    })

    if (!segment) {
      return NextResponse.json(
        { success: false, error: 'Segment nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      segment: {
        ...segment,
        leadCount: segment._count.leads,
        leads: segment.leads.map(ls => ls.lead)
      }
    })
  } catch (error) {
    console.error('Fehler beim Laden des Segments:', error)
    return NextResponse.json(
      { success: false, error: 'Segment konnte nicht geladen werden' },
      { status: 500 }
    )
  }
}

// PUT /api/segments/[id] - Segment aktualisieren
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { name, description, color } = body

    const existing = await db.segment.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Segment nicht gefunden' },
        { status: 404 }
      )
    }

    const segment = await db.segment.update({
      where: { id: params.id },
      data: {
        name: name?.trim() || existing.name,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        color: color !== undefined ? (color || null) : existing.color
      }
    })

    return NextResponse.json({
      success: true,
      segment
    })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Segments:', error)
    return NextResponse.json(
      { success: false, error: 'Segment konnte nicht aktualisiert werden' },
      { status: 500 }
    )
  }
}

// DELETE /api/segments/[id] - Segment löschen
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const existing = await db.segment.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Segment nicht gefunden' },
        { status: 404 }
      )
    }

    await db.segment.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Segment gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Segments:', error)
    return NextResponse.json(
      { success: false, error: 'Segment konnte nicht gelöscht werden' },
      { status: 500 }
    )
  }
}
