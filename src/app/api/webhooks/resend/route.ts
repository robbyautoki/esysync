import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Handle bounce events
    if (type === 'email.bounced') {
      const email = data.to?.[0]
      
      if (email) {
        // Find lead by email
        const lead = await db.lead.findUnique({
          where: { email: email.toLowerCase() }
        })

        if (lead) {
          // Update lead status
          await db.lead.update({
            where: { id: lead.id },
            data: { status: 'BOUNCED' }
          })

          // Create bounce event
          await db.event.create({
            data: {
              leadId: lead.id,
              type: 'EMAIL_BOUNCED',
              metadata: {
                reason: data.bounce?.type || 'unknown',
                email: email
              }
            }
          })

          // Stop all active sequences for this lead
          await db.sequenceState.updateMany({
            where: {
              leadId: lead.id,
              status: 'ACTIVE'
            },
            data: {
              status: 'STOPPED_BOUNCE'
            }
          })
        }
      }
    }

    // Handle delivery events (optional tracking)
    if (type === 'email.delivered') {
      // Can be used for delivery confirmation tracking
      console.log('Email delivered:', data)
    }

    // Handle complaint events (spam reports)
    if (type === 'email.complained') {
      const email = data.to?.[0]
      
      if (email) {
        const lead = await db.lead.findUnique({
          where: { email: email.toLowerCase() }
        })

        if (lead) {
          await db.lead.update({
            where: { id: lead.id },
            data: { status: 'UNSUBSCRIBED' }
          })

          await db.event.create({
            data: {
              leadId: lead.id,
              type: 'UNSUBSCRIBED',
              metadata: {
                reason: 'spam_complaint',
                email: email
              }
            }
          })

          await db.sequenceState.updateMany({
            where: {
              leadId: lead.id,
              status: 'ACTIVE'
            },
            data: {
              status: 'UNSUBSCRIBED'
            }
          })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
