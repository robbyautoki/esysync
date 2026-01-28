import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await db.lead.findUnique({
      where: { id: params.id },
      include: {
        segments: {
          include: {
            segment: {
              select: { id: true, name: true, color: true }
            }
          }
        },
        sequenceStates: {
          include: {
            sequence: {
              select: { 
                id: true, 
                name: true, 
                color: true,
                steps: {
                  select: { id: true },
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead nicht gefunden' },
        { status: 404 }
      )
    }

    // Berechne Engagement-Statistiken
    const emailsSent = lead.events.filter(e => e.type === 'EMAIL_SENT').length
    const emailsOpened = lead.events.filter(e => e.type === 'EMAIL_OPENED').length
    const emailsClicked = lead.events.filter(e => e.type === 'EMAIL_CLICKED').length

    const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0
    const clickRate = emailsSent > 0 ? Math.round((emailsClicked / emailsSent) * 100) : 0

    // Engagement Score berechnen (0-100)
    let engagementScore = 0
    if (emailsSent > 0) {
      engagementScore = Math.min(100, Math.round(
        (openRate * 0.4) + (clickRate * 0.6) + (emailsClicked > 0 ? 20 : 0)
      ))
    }

    // Engagement Label
    let engagementLabel = 'Kein'
    if (engagementScore >= 70) engagementLabel = 'Sehr gut'
    else if (engagementScore >= 40) engagementLabel = 'Gut'
    else if (engagementScore >= 10) engagementLabel = 'Niedrig'

    // Sequenzen formatieren
    const sequences = lead.sequenceStates.map(state => ({
      id: state.sequence.id,
      name: state.sequence.name,
      color: state.sequence.color,
      currentStep: state.currentStepIndex + 1,
      totalSteps: state.sequence.steps.length,
      status: state.status,
      startedAt: state.startedAt,
      completedAt: state.completedAt
    }))

    // Segmente formatieren
    const segments = lead.segments.map(ls => ({
      id: ls.segment.id,
      name: ls.segment.name,
      color: ls.segment.color
    }))

    // Tags aus customFields extrahieren
    const customFields = (lead.customFields as Record<string, unknown>) || {}
    const tags = (customFields.tags as string[]) || []

    // Timeline formatieren
    const timeline = lead.events.map(event => {
      const metadata = event.metadata as Record<string, unknown> | null
      return {
        id: event.id,
        type: event.type,
        createdAt: event.createdAt,
        subject: metadata?.subject as string | undefined,
        sequenceName: metadata?.sequenceName as string | undefined,
        stepIndex: metadata?.stepIndex as number | undefined,
        url: metadata?.url as string | undefined,
        linkText: metadata?.linkText as string | undefined
      }
    })

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        email: lead.email,
        firstName: lead.firstName,
        status: lead.status,
        createdAt: lead.createdAt
      },
      engagement: {
        emailsSent,
        emailsOpened,
        emailsClicked,
        openRate,
        clickRate,
        score: engagementScore,
        label: engagementLabel
      },
      sequences,
      segments,
      tags,
      timeline
    })
  } catch (error) {
    console.error('Error fetching lead history:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Laden der History' },
      { status: 500 }
    )
  }
}
