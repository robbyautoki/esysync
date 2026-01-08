import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateApiKey, unauthorizedResponse } from '@/lib/api-auth'

// GET /api/v1/sequences - List all sequences
export async function GET(request: NextRequest) {
  if (!await validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const sequences = await db.sequence.findMany({
    include: {
      steps: {
        orderBy: { order: 'asc' }
      },
      _count: {
        select: { states: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({
    data: sequences.map(seq => ({
      id: seq.id,
      name: seq.name,
      trigger: seq.trigger,
      isActive: seq.isActive,
      trackOpens: seq.trackOpens,
      trackClicks: seq.trackClicks,
      sendTime: seq.sendTime,
      stepsCount: seq.steps.length,
      leadsCount: seq._count.states,
      createdAt: seq.createdAt,
      updatedAt: seq.updatedAt
    }))
  })
}
