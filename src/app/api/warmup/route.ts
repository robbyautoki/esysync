import { NextRequest, NextResponse } from 'next/server'
import { getWarmupStatus, getOrCreateSettings } from '@/lib/warmup'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const status = await getWarmupStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting warmup status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { warmupEnabled, resetStartDate } = body
    
    const updateData: any = {}
    
    if (typeof warmupEnabled === 'boolean') {
      updateData.warmupEnabled = warmupEnabled
    }
    
    if (resetStartDate) {
      updateData.warmupStartDate = new Date()
    }
    
    // Ensure settings exist
    await getOrCreateSettings()
    
    const settings = await db.settings.update({
      where: { id: 'default' },
      data: updateData
    })
    
    const status = await getWarmupStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error updating warmup settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
