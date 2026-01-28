import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [activeSequences, totalLeads] = await Promise.all([
    db.sequence.count({ where: { isActive: true } }),
    db.lead.count()
  ])

  return NextResponse.json({ activeSequences, totalLeads })
}
