import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let settings = await db.settings.findUnique({
    where: { id: 'default' }
  })

  if (!settings) {
    settings = await db.settings.create({
      data: { id: 'default' }
    })
  }

  return NextResponse.json({
    companyProfile: settings.companyProfile
  })
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const settings = await db.settings.upsert({
    where: { id: 'default' },
    update: {
      ...(body.companyProfile !== undefined && { companyProfile: body.companyProfile })
    },
    create: {
      id: 'default',
      ...(body.companyProfile && { companyProfile: body.companyProfile })
    }
  })

  return NextResponse.json({
    success: true,
    companyProfile: settings.companyProfile
  })
}
