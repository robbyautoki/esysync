import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET: Alle Ordner laden
export async function GET() {
  try {
    const folders = await db.sequenceFolder.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { sequences: true }
        }
      }
    })

    return NextResponse.json({ success: true, folders })
  } catch (error) {
    console.error('Error loading folders:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Laden der Ordner' },
      { status: 500 }
    )
  }
}

const createFolderSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  color: z.string().optional()
})

// POST: Neuen Ordner erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color } = createFolderSchema.parse(body)

    // Höchste Order finden
    const lastFolder = await db.sequenceFolder.findFirst({
      orderBy: { order: 'desc' }
    })
    const nextOrder = (lastFolder?.order ?? -1) + 1

    const folder = await db.sequenceFolder.create({
      data: {
        name,
        color,
        order: nextOrder
      }
    })

    return NextResponse.json({ success: true, folder })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Erstellen des Ordners' },
      { status: 500 }
    )
  }
}

const updateFolderSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  order: z.number().optional()
})

// PUT: Ordner aktualisieren
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = updateFolderSchema.parse(body)

    const folder = await db.sequenceFolder.update({
      where: { id },
      data
    })

    return NextResponse.json({ success: true, folder })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error updating folder:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Aktualisieren des Ordners' },
      { status: 500 }
    )
  }
}

const deleteFolderSchema = z.object({
  id: z.string()
})

// DELETE: Ordner löschen (Sequenzen werden auf folderId=null gesetzt)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = deleteFolderSchema.parse(body)

    await db.sequenceFolder.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Löschen des Ordners' },
      { status: 500 }
    )
  }
}
