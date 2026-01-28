import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getEsySyncUsers } from '@/lib/esysync-db'

export const dynamic = 'force-dynamic'

const ESYSYNC_SEGMENT_ID = 'esysync'

async function ensureEsySyncSegment() {
  const existing = await db.segment.findUnique({
    where: { id: ESYSYNC_SEGMENT_ID }
  })
  
  if (!existing) {
    await db.segment.create({
      data: {
        id: ESYSYNC_SEGMENT_ID,
        name: 'EsySync',
        description: 'Automatisch synchronisierte User aus EsySync',
        color: '#8b5cf6'
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure segment exists
    await ensureEsySyncSegment()
    
    // Fetch all users from EsySync database
    const esysyncUsers = await getEsySyncUsers()

    // Get existing leads and their emails
    const existingLeads = await db.lead.findMany({
      where: {
        email: { in: esysyncUsers.map(u => u.email.toLowerCase()) }
      },
      select: { id: true, email: true, status: true }
    })

    const existingEmailMap = new Map(existingLeads.map(l => [l.email.toLowerCase(), l]))
    const unsubscribedEmails = new Set(
      existingLeads.filter(l => l.status === 'UNSUBSCRIBED').map(l => l.email.toLowerCase())
    )

    // Get existing segment memberships
    const existingMemberships = await db.leadSegment.findMany({
      where: { segmentId: ESYSYNC_SEGMENT_ID },
      select: { leadId: true }
    })
    const existingMemberIds = new Set(existingMemberships.map(m => m.leadId))

    let imported = 0
    let addedToSegment = 0
    let skippedUnsubscribed = 0

    for (const user of esysyncUsers) {
      const emailLower = user.email.toLowerCase()
      
      // Skip unsubscribed
      if (unsubscribedEmails.has(emailLower)) {
        skippedUnsubscribed++
        continue
      }

      let leadId: string

      // Check if lead exists
      const existingLead = existingEmailMap.get(emailLower)
      
      if (existingLead) {
        leadId = existingLead.id
      } else {
        // Create new lead
        const newLead = await db.lead.create({
          data: {
            email: emailLower,
            firstName: user.firstname || ''
          }
        })
        leadId = newLead.id
        imported++
      }

      // Add to segment if not already member
      if (!existingMemberIds.has(leadId)) {
        try {
          await db.leadSegment.create({
            data: {
              leadId,
              segmentId: ESYSYNC_SEGMENT_ID
            }
          })
          addedToSegment++
          existingMemberIds.add(leadId)
        } catch {
          // Ignore duplicate errors
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalUsers: esysyncUsers.length,
      imported,
      addedToSegment,
      skippedUnsubscribed
    })
  } catch (error) {
    console.error('EsySync sync error:', error)
    return NextResponse.json(
      { success: false, error: 'Synchronisierung fehlgeschlagen' },
      { status: 500 }
    )
  }
}
