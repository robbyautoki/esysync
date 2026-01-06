import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const original = await db.sequence.findUnique({
      where: { id: params.id },
      include: { steps: true }
    })

    if (!original) {
      return NextResponse.json(
        { error: 'not_found', message: 'Sequenz nicht gefunden' },
        { status: 404 }
      )
    }

    const sequence = await db.sequence.create({
      data: {
        name: `${original.name} (Kopie)`,
        trigger: original.trigger,
        isActive: false,
        steps: {
          create: original.steps.map(step => ({
            type: step.type,
            order: step.order,
            subject: step.subject,
            content: step.content ?? undefined,
            delayValue: step.delayValue,
            delayUnit: step.delayUnit
          }))
        }
      },
      include: { steps: true }
    })

    return NextResponse.json({ success: true, sequence }, { status: 201 })
  } catch (error) {
    console.error('Duplicate error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Sequenz konnte nicht dupliziert werden' },
      { status: 500 }
    )
  }
}
