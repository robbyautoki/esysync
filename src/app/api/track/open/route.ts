import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 1x1 transparent pixel
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (id) {
    try {
      // Parse the tracking ID (format: leadId_sequenceId_stepId)
      const [leadId, sequenceId, stepId] = id.split('_')
      
      if (leadId) {
        // Check if we already tracked this open
        const existingOpen = await db.event.findFirst({
          where: {
            leadId,
            type: 'EMAIL_OPENED',
            metadata: {
              path: ['trackingId'],
              equals: id
            }
          }
        })

        // Only track first open
        if (!existingOpen) {
          await db.event.create({
            data: {
              leadId,
              type: 'EMAIL_OPENED',
              metadata: {
                trackingId: id,
                sequenceId,
                stepId
              }
            }
          })
          
          // Update lead score (+5 for open)
          await db.lead.update({
            where: { id: leadId },
            data: { score: { increment: 5 } }
          })
        }
      }
    } catch (error) {
      console.error('Open tracking error:', error)
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}
