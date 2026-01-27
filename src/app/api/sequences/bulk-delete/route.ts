import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = bulkDeleteSchema.parse(body)

    // Get info about sequences being deleted
    const sequences = await db.sequence.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: { states: true }
        }
      }
    })

    const activeCount = sequences.filter(s => s.isActive).length
    const totalLeadsAffected = sequences.reduce((sum, s) => sum + s._count.states, 0)

    // Delete all sequences (cascade will handle steps and states)
    await db.sequence.deleteMany({
      where: { id: { in: ids } }
    })

    return NextResponse.json({
      success: true,
      deleted: ids.length,
      activeCount,
      totalLeadsAffected
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Bulk delete error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Sequenzen konnten nicht gelöscht werden' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch info before deletion (for confirmation dialog)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    
    if (!idsParam) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 })
    }

    const ids = idsParam.split(',')

    const sequences = await db.sequence.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: { states: true }
        }
      }
    })

    const activeCount = sequences.filter(s => s.isActive).length
    const totalLeadsAffected = sequences.reduce((sum, s) => sum + s._count.states, 0)

    return NextResponse.json({
      count: sequences.length,
      activeCount,
      totalLeadsAffected
    })
  } catch (error) {
    console.error('Error fetching delete info:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Fehler beim Abrufen der Informationen' },
      { status: 500 }
    )
  }
}
