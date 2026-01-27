import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getWarmupStatus } from '@/lib/warmup'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sequence = await db.sequence.findUnique({
      where: { id: params.id },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        },
        states: {
          where: {
            status: 'ACTIVE'
          }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json(
        { error: 'not_found', message: 'Sequenz nicht gefunden' },
        { status: 404 }
      )
    }

    // Zähle E-Mail-Steps
    const emailSteps = sequence.steps.filter(step => step.type === 'EMAIL').length

    // Anzahl aktiver Leads in der Sequenz
    const totalLeads = sequence.states.length

    // Geschätzte Gesamt-Mails
    const totalEmails = totalLeads * emailSteps

    // Geschätzte Dauer basierend auf Warmup-Limit
    const warmupStatus = await getWarmupStatus()
    const dailyLimit = warmupStatus.dailyLimit ?? 100 // Fallback wenn unbegrenzt
    const estimatedDays = totalEmails > 0 ? Math.ceil(totalEmails / dailyLimit) : 0

    return NextResponse.json({
      success: true,
      preview: {
        totalLeads,
        emailSteps,
        totalEmails,
        estimatedDays,
        scheduledStartAt: sequence.scheduledStartAt,
        warmup: {
          dailyLimit: warmupStatus.dailyLimit,
          isComplete: warmupStatus.isComplete
        }
      }
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Vorschau konnte nicht geladen werden' },
      { status: 500 }
    )
  }
}
