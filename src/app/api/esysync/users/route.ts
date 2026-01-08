import { NextResponse } from 'next/server'
import { getEsySyncUsers } from '@/lib/esysync-db'

export async function GET() {
  try {
    const users = await getEsySyncUsers()
    
    // Transform: split name into firstName
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.name,
      firstName: user.name?.split(' ')[0] || user.name || 'Unbekannt',
      createdAt: user.created_at
    }))

    return NextResponse.json({ 
      success: true, 
      data: transformedUsers,
      count: transformedUsers.length
    })
  } catch (error) {
    console.error('Error fetching EsySync users:', error)
    return NextResponse.json(
      { success: false, error: 'Verbindung zur Datenbank fehlgeschlagen' },
      { status: 500 }
    )
  }
}
