import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const decodedUrl = decodeURIComponent(url)

  if (id) {
    try {
      // Parse the tracking ID (format: leadId_sequenceId_stepId)
      const [leadId, sequenceId, stepId] = id.split('_')
      
      if (leadId) {
        // Check if first click on this specific link
        const existingClick = await db.event.findFirst({
          where: {
            leadId,
            type: 'EMAIL_CLICKED',
            metadata: {
              path: ['trackingId'],
              equals: id
            }
          }
        })

        await db.event.create({
          data: {
            leadId,
            type: 'EMAIL_CLICKED',
            metadata: {
              trackingId: id,
              sequenceId,
              stepId,
              url: decodedUrl
            }
          }
        })

        // Update lead score (+10 for first click on this email)
        if (!existingClick) {
          await db.lead.update({
            where: { id: leadId },
            data: { score: { increment: 10 } }
          })
        }
      }
    } catch (error) {
      console.error('Click tracking error:', error)
    }
  }

  return NextResponse.redirect(decodedUrl)
}
