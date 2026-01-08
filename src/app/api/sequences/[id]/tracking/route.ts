import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sequenceId = params.id

    // Get all events for this sequence
    const events = await db.event.findMany({
      where: {
        metadata: {
          path: ['sequenceId'],
          equals: sequenceId
        }
      },
      include: {
        lead: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Count unique leads
    const sentLeads = new Set<string>()
    const openedLeads = new Set<string>()
    const clickedLeads = new Set<string>()
    const recentClicks: Array<{
      leadId: string
      leadName: string
      url: string
      clickedAt: string
    }> = []

    for (const event of events) {
      if (event.type === 'EMAIL_SENT') {
        sentLeads.add(event.leadId)
      }
      if (event.type === 'EMAIL_OPENED') {
        openedLeads.add(event.leadId)
      }
      if (event.type === 'EMAIL_CLICKED') {
        clickedLeads.add(event.leadId)
        const metadata = event.metadata as Record<string, string> | null
        if (recentClicks.length < 10 && metadata?.url) {
          recentClicks.push({
            leadId: event.leadId,
            leadName: event.lead.firstName,
            url: metadata.url,
            clickedAt: event.createdAt.toISOString()
          })
        }
      }
    }

    const totalSent = sentLeads.size
    const uniqueOpens = openedLeads.size
    const uniqueClicks = clickedLeads.size

    const openRate = totalSent > 0 ? Math.round((uniqueOpens / totalSent) * 100) : 0
    const clickRate = uniqueOpens > 0 ? Math.round((uniqueClicks / uniqueOpens) * 100) : 0

    return NextResponse.json({
      totalSent,
      uniqueOpens,
      uniqueClicks,
      openRate,
      clickRate,
      recentClicks
    })
  } catch (error) {
    console.error('Error fetching tracking stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
