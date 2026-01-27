import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sequenceId = params.id

    // Get sequence with steps
    const sequence = await db.sequence.findUnique({
      where: { id: sequenceId },
      include: {
        steps: {
          where: { type: 'EMAIL' },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Create stepId to index mapping
    const stepIdToIndex: Record<string, number> = {}
    sequence.steps.forEach((step, index) => {
      stepIdToIndex[step.id] = index
    })

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
    const bouncedLeads = new Set<string>()
    const unsubscribedLeads = new Set<string>()

    // Per-step stats
    const stepStats: Record<number, { sent: Set<string>; opens: Set<string>; clicks: Set<string> }> = {}
    
    // Timeline data (last 14 days)
    const timelineData: Record<string, { opens: number; clicks: number }> = {}
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split('T')[0]
      timelineData[key] = { opens: 0, clicks: 0 }
    }

    // Top links
    const linkClicks: Record<string, number> = {}

    // Recent activity (opens + clicks)
    const recentActivity: Array<{
      leadId: string
      leadName: string
      type: 'open' | 'click'
      url?: string
      timestamp: string
    }> = []

    for (const event of events) {
      const metadata = event.metadata as Record<string, unknown> | null
      // Support both stepIndex (new) and stepId (old) for backward compatibility
      let stepIndex = metadata?.stepIndex as number | undefined
      if (stepIndex === undefined && metadata?.stepId) {
        stepIndex = stepIdToIndex[metadata.stepId as string]
      }

      if (event.type === 'EMAIL_SENT') {
        sentLeads.add(event.leadId)
        if (stepIndex !== undefined) {
          if (!stepStats[stepIndex]) stepStats[stepIndex] = { sent: new Set(), opens: new Set(), clicks: new Set() }
          stepStats[stepIndex].sent.add(event.leadId)
        }
      }

      if (event.type === 'EMAIL_OPENED') {
        openedLeads.add(event.leadId)
        if (stepIndex !== undefined) {
          if (!stepStats[stepIndex]) stepStats[stepIndex] = { sent: new Set(), opens: new Set(), clicks: new Set() }
          stepStats[stepIndex].opens.add(event.leadId)
        }
        // Timeline
        const dateKey = event.createdAt.toISOString().split('T')[0]
        if (timelineData[dateKey]) timelineData[dateKey].opens++
        // Recent activity
        if (recentActivity.length < 15) {
          recentActivity.push({
            leadId: event.leadId,
            leadName: event.lead.firstName || event.lead.email.split('@')[0],
            type: 'open',
            timestamp: event.createdAt.toISOString()
          })
        }
      }

      if (event.type === 'EMAIL_CLICKED') {
        clickedLeads.add(event.leadId)
        const url = metadata?.url as string | undefined
        if (stepIndex !== undefined) {
          if (!stepStats[stepIndex]) stepStats[stepIndex] = { sent: new Set(), opens: new Set(), clicks: new Set() }
          stepStats[stepIndex].clicks.add(event.leadId)
        }
        // Timeline
        const dateKey = event.createdAt.toISOString().split('T')[0]
        if (timelineData[dateKey]) timelineData[dateKey].clicks++
        // Top links
        if (url) {
          linkClicks[url] = (linkClicks[url] || 0) + 1
        }
        // Recent activity
        if (recentActivity.length < 15) {
          recentActivity.push({
            leadId: event.leadId,
            leadName: event.lead.firstName || event.lead.email.split('@')[0],
            type: 'click',
            url,
            timestamp: event.createdAt.toISOString()
          })
        }
      }

      if (event.type === 'EMAIL_BOUNCED') {
        bouncedLeads.add(event.leadId)
      }

      if (event.type === 'UNSUBSCRIBED') {
        unsubscribedLeads.add(event.leadId)
      }
    }

    // Get active leads count
    const activeLeads = await db.sequenceState.count({
      where: {
        sequenceId,
        status: 'ACTIVE'
      }
    })

    // Get active leads per step
    const activeLeadsByStep = await db.sequenceState.groupBy({
      by: ['currentStepIndex'],
      where: {
        sequenceId,
        status: 'ACTIVE'
      },
      _count: true
    })

    const totalSent = sentLeads.size
    const uniqueOpens = openedLeads.size
    const uniqueClicks = clickedLeads.size
    const bounces = bouncedLeads.size
    const unsubscribes = unsubscribedLeads.size

    const openRate = totalSent > 0 ? Math.round((uniqueOpens / totalSent) * 100) : 0
    const clickRate = uniqueOpens > 0 ? Math.round((uniqueClicks / uniqueOpens) * 100) : 0

    // Format step stats
    const formattedStepStats = sequence.steps.map((step, index) => {
      const stats = stepStats[index] || { sent: new Set(), opens: new Set(), clicks: new Set() }
      const sent = stats.sent.size
      const opens = stats.opens.size
      const clicks = stats.clicks.size
      return {
        stepIndex: index,
        subject: step.subject || `Step ${index + 1}`,
        sent,
        opens,
        clicks,
        openRate: sent > 0 ? Math.round((opens / sent) * 100) : 0,
        clickRate: opens > 0 ? Math.round((clicks / opens) * 100) : 0
      }
    })

    // Format timeline
    const formattedTimeline = Object.entries(timelineData).map(([date, data]) => ({
      date,
      opens: data.opens,
      clicks: data.clicks
    }))

    // Format top links (top 5)
    const topLinks = Object.entries(linkClicks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([url, clicks]) => ({ url, clicks }))

    // Format active leads by step
    const formattedActiveByStep = activeLeadsByStep.map(item => ({
      stepIndex: item.currentStepIndex,
      count: item._count
    }))

    // Format recentClicks for backward compatibility with sequence-tracking widget
    const recentClicks = recentActivity
      .filter(a => a.type === 'click')
      .map(a => ({
        leadId: a.leadId,
        leadName: a.leadName,
        url: a.url || '',
        clickedAt: a.timestamp
      }))

    return NextResponse.json({
      totalSent,
      uniqueOpens,
      uniqueClicks,
      openRate,
      clickRate,
      bounces,
      unsubscribes,
      activeLeads,
      activeLeadsByStep: formattedActiveByStep,
      stepStats: formattedStepStats,
      timeline: formattedTimeline,
      topLinks,
      recentActivity,
      recentClicks
    })
  } catch (error) {
    console.error('Error fetching tracking stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
