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

    await db.lead.deleteMany({
      where: {
        id: { in: ids }
      }
    })

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Bulk delete error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Leads konnten nicht gelöscht werden' },
      { status: 500 }
    )
  }
}
