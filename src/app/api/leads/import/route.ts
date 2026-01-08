import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const importSchema = z.object({
  leads: z.array(z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    customFields: z.record(z.string()).optional()
  })),
  sequenceId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leads, sequenceId } = importSchema.parse(body)

    // Get existing emails and check their status
    const existingLeads = await db.lead.findMany({
      where: {
        email: { in: leads.map(l => l.email.toLowerCase()) }
      },
      select: { email: true, status: true }
    })

    const existingEmails = new Set(existingLeads.map(l => l.email.toLowerCase()))
    const unsubscribedEmails = new Set(
      existingLeads.filter(l => l.status === 'UNSUBSCRIBED').map(l => l.email.toLowerCase())
    )
    
    // Filter out duplicates and unsubscribed
    const newLeads = leads.filter(l => !existingEmails.has(l.email.toLowerCase()))
    const duplicates = leads.filter(l => existingEmails.has(l.email.toLowerCase()) && !unsubscribedEmails.has(l.email.toLowerCase())).length
    const unsubscribedSkipped = unsubscribedEmails.size

    // Import new leads
    const errors: string[] = []
    let imported = 0

    for (const lead of newLeads) {
      try {
        const createdLead = await db.lead.create({
          data: {
            email: lead.email.toLowerCase(),
            firstName: lead.firstName,
            customFields: lead.customFields
          }
        })

        // Add to sequence if specified
        if (sequenceId) {
          await db.sequenceState.create({
            data: {
              leadId: createdLead.id,
              sequenceId,
              status: 'ACTIVE'
            }
          })
        }

        imported++
      } catch (error: any) {
        errors.push(`${lead.email}: ${error.message}`)
      }
    }

    return NextResponse.json({
      imported,
      duplicates,
      unsubscribedSkipped,
      errors
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'internal', message: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
