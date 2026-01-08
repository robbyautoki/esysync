import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const importSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    firstName: z.string()
  })),
  sequenceId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { users, sequenceId } = importSchema.parse(body)

    // Check existing emails
    const existingLeads = await db.lead.findMany({
      where: {
        email: { in: users.map(u => u.email.toLowerCase()) }
      },
      select: { email: true, status: true }
    })

    const existingEmails = new Set(existingLeads.map(l => l.email.toLowerCase()))
    const unsubscribedEmails = new Set(
      existingLeads.filter(l => l.status === 'UNSUBSCRIBED').map(l => l.email.toLowerCase())
    )

    // Filter new users
    const newUsers = users.filter(u => !existingEmails.has(u.email.toLowerCase()))
    const skippedUnsubscribed = users.filter(u => unsubscribedEmails.has(u.email.toLowerCase())).length

    let imported = 0
    const errors: string[] = []

    for (const user of newUsers) {
      try {
        const lead = await db.lead.create({
          data: {
            email: user.email.toLowerCase(),
            firstName: user.firstName
          }
        })

        // Add to sequence if specified
        if (sequenceId) {
          await db.sequenceState.create({
            data: {
              leadId: lead.id,
              sequenceId,
              status: 'ACTIVE',
              nextRunAt: new Date()
            }
          })
        }

        imported++
      } catch (error: any) {
        errors.push(`${user.email}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      duplicates: existingEmails.size - skippedUnsubscribed,
      skippedUnsubscribed,
      errors
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Ungültige Daten', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Import error:', error)
    return NextResponse.json(
      { success: false, error: 'Import fehlgeschlagen' },
      { status: 500 }
    )
  }
}
