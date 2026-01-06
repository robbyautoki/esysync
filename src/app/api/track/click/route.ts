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
      }
    } catch (error) {
      console.error('Click tracking error:', error)
    }
  }

  return NextResponse.redirect(decodedUrl)
}
