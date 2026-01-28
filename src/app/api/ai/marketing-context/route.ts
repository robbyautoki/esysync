import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Segmente mit Lead-Count laden
    const segments = await db.segment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    })

    // Alle Tags aus Leads extrahieren (customFields.tags)
    const leads = await db.lead.findMany({
      where: {
        customFields: {
          not: Prisma.JsonNull
        }
      },
      select: {
        customFields: true
      }
    })

    const allTags = new Set<string>()
    for (const lead of leads) {
      const customFields = lead.customFields as Record<string, unknown> | null
      if (customFields?.tags && Array.isArray(customFields.tags)) {
        for (const tag of customFields.tags) {
          if (typeof tag === 'string') {
            allTags.add(tag)
          }
        }
      }
    }

    // Auch Tags aus Sequence Steps sammeln
    const stepsWithTags = await db.sequenceStep.findMany({
      where: {
        type: 'TAG',
        tagValue: { not: null }
      },
      select: {
        tagValue: true
      }
    })

    for (const step of stepsWithTags) {
      if (step.tagValue) {
        allTags.add(step.tagValue)
      }
    }

    // Letzte Sequenzen für Kontext
    const recentSequences = await db.sequence.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        trigger: true,
        isActive: true,
        _count: {
          select: { steps: true, states: true }
        }
      }
    })

    // Lead-Statistiken
    const totalLeads = await db.lead.count()
    const activeLeads = await db.lead.count({
      where: { status: 'ACTIVE' }
    })

    // Inaktive Leads (keine Events in letzten 30 Tagen)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentlyActiveLeadIds = await db.event.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { leadId: true },
      distinct: ['leadId']
    })

    const inactiveLeads = totalLeads - recentlyActiveLeadIds.length

    return NextResponse.json({
      success: true,
      segments: segments.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        color: s.color,
        leadCount: s._count.leads
      })),
      tags: Array.from(allTags).sort(),
      recentSequences: recentSequences.map(s => ({
        id: s.id,
        name: s.name,
        trigger: s.trigger,
        isActive: s.isActive,
        stepCount: s._count.steps,
        leadCount: s._count.states
      })),
      stats: {
        totalLeads,
        activeLeads,
        inactiveLeads,
        segmentCount: segments.length
      }
    })
  } catch (error) {
    console.error('Marketing context error:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Laden des Marketing-Kontexts' },
      { status: 500 }
    )
  }
}
