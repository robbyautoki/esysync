import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/segments - Alle Segmente mit Lead-Count
export async function GET() {
  try {
    const segments = await db.segment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      segments: segments.map(s => ({
        ...s,
        leadCount: s._count.leads
      }))
    })
  } catch (error) {
    console.error('Fehler beim Laden der Segmente:', error)
    return NextResponse.json(
      { success: false, error: 'Segmente konnten nicht geladen werden' },
      { status: 500 }
    )
  }
}

// POST /api/segments - Neues Segment erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name ist erforderlich' },
        { status: 400 }
      )
    }

    const segment = await db.segment.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null
      }
    })

    return NextResponse.json({
      success: true,
      segment
    })
  } catch (error) {
    console.error('Fehler beim Erstellen des Segments:', error)
    return NextResponse.json(
      { success: false, error: 'Segment konnte nicht erstellt werden' },
      { status: 500 }
    )
  }
}
