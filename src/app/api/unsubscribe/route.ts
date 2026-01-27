import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, feedbackReason, feedbackText } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token fehlt' },
        { status: 400 }
      )
    }

    // Decode token (base64 encoded leadId)
    let leadId: string
    try {
      leadId = Buffer.from(token, 'base64').toString('utf-8')
    } catch {
      return NextResponse.json(
        { error: 'Ungültiger Token' },
        { status: 400 }
      )
    }

    const lead = await db.lead.findUnique({
      where: { id: leadId }
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead nicht gefunden' },
        { status: 404 }
      )
    }

    // Update lead status
    await db.lead.update({
      where: { id: leadId },
      data: { status: 'UNSUBSCRIBED' }
    })

    // Create unsubscribe event
    await db.event.create({
      data: {
        leadId,
        type: 'UNSUBSCRIBED',
        metadata: {
          source: 'user_request',
          reason: feedbackReason || null,
          feedbackText: feedbackText || null
        }
      }
    })

    // Stop all active sequences
    await db.sequenceState.updateMany({
      where: {
        leadId,
        status: 'ACTIVE'
      },
      data: {
        status: 'UNSUBSCRIBED'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Abmeldung fehlgeschlagen' },
      { status: 500 }
    )
  }
}
