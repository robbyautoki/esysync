import { NextResponse } from 'next/server'
import { getEsySyncUsers } from '@/lib/esysync-db'

export async function GET() {
  try {
    const users = await getEsySyncUsers()
    
    const transformedUsers = users.map(user => ({
      id: user.email,  // Email als eindeutiger Identifier
      email: user.email,
      firstName: user.firstname || 'Unbekannt',
      lastName: user.lastname || '',
      fullName: [user.firstname, user.lastname].filter(Boolean).join(' ') || 'Unbekannt',
      isVerified: user.isverified
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
