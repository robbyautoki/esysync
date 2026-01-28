import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface CompanyProfile {
  id: string
  name: string
  companyName: string
  industry: string
  targetAudience: string
  tone: string
  products?: string
  uniqueValue?: string
  [key: string]: string | undefined
}

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

  const profiles = (settings.companyProfiles as CompanyProfile[] | null) || []
  const activeProfile = profiles.find(p => p.id === settings.activeProfileId) || null

  return NextResponse.json({
    profiles,
    activeProfileId: settings.activeProfileId,
    activeProfile,
    // Backwards compatibility
    companyProfile: activeProfile
  })
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // Altes Format (companyProfile) -> neues Format migrieren
  if (body.companyProfile && !body.profiles) {
    let settings = await db.settings.findUnique({ where: { id: 'default' } })
    const existingProfiles = (settings?.companyProfiles as CompanyProfile[] | null) || []
    
    // Prüfe ob es ein Update eines existierenden Profils ist
    const activeId = settings?.activeProfileId
    if (activeId) {
      const updatedProfiles = existingProfiles.map(p => 
        p.id === activeId ? { ...p, ...body.companyProfile } : p
      )
      settings = await db.settings.update({
        where: { id: 'default' },
        data: { companyProfiles: updatedProfiles }
      })
    } else {
      // Neues Profil erstellen
      const newProfile: CompanyProfile = {
        id: `profile-${Date.now()}`,
        name: body.companyProfile.companyName || 'Mein Unternehmen',
        ...body.companyProfile
      }
      settings = await db.settings.upsert({
        where: { id: 'default' },
        update: { 
          companyProfiles: [...existingProfiles, newProfile],
          activeProfileId: newProfile.id
        },
        create: { 
          id: 'default',
          companyProfiles: [newProfile],
          activeProfileId: newProfile.id
        }
      })
    }

    const profiles = (settings.companyProfiles as CompanyProfile[]) || []
    const activeProfile = profiles.find(p => p.id === settings.activeProfileId) || null

    return NextResponse.json({
      success: true,
      profiles,
      activeProfileId: settings.activeProfileId,
      activeProfile,
      companyProfile: activeProfile
    })
  }

  // Neues Format: Profile direkt verwalten
  if (body.addProfile) {
    let settings = await db.settings.findUnique({ where: { id: 'default' } })
    const existingProfiles = (settings?.companyProfiles as CompanyProfile[] | null) || []
    
    const newProfile: CompanyProfile = {
      id: `profile-${Date.now()}`,
      name: body.addProfile.name || body.addProfile.companyName || 'Neues Profil',
      ...body.addProfile
    }

    settings = await db.settings.upsert({
      where: { id: 'default' },
      update: { 
        companyProfiles: [...existingProfiles, newProfile],
        activeProfileId: newProfile.id
      },
      create: { 
        id: 'default',
        companyProfiles: [newProfile],
        activeProfileId: newProfile.id
      }
    })

    const profiles = (settings.companyProfiles as CompanyProfile[]) || []
    return NextResponse.json({
      success: true,
      profiles,
      activeProfileId: settings.activeProfileId,
      newProfile
    })
  }

  // Aktives Profil wechseln
  if (body.activeProfileId !== undefined) {
    const settings = await db.settings.update({
      where: { id: 'default' },
      data: { activeProfileId: body.activeProfileId }
    })

    const profiles = (settings.companyProfiles as CompanyProfile[]) || []
    const activeProfile = profiles.find(p => p.id === body.activeProfileId) || null

    return NextResponse.json({
      success: true,
      profiles,
      activeProfileId: settings.activeProfileId,
      activeProfile
    })
  }

  // Profil löschen
  if (body.deleteProfileId) {
    let settings = await db.settings.findUnique({ where: { id: 'default' } })
    const existingProfiles = (settings?.companyProfiles as CompanyProfile[] | null) || []
    const filteredProfiles = existingProfiles.filter(p => p.id !== body.deleteProfileId)
    
    const newActiveId = settings?.activeProfileId === body.deleteProfileId 
      ? (filteredProfiles[0]?.id || null)
      : settings?.activeProfileId

    settings = await db.settings.update({
      where: { id: 'default' },
      data: { 
        companyProfiles: filteredProfiles,
        activeProfileId: newActiveId
      }
    })

    return NextResponse.json({
      success: true,
      profiles: filteredProfiles,
      activeProfileId: newActiveId
    })
  }

  return NextResponse.json({ success: true })
}
