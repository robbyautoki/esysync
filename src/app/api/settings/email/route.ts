import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const emailSettingsSchema = z.object({
  footerLogo: z.string().nullable().optional(),
  footerText: z.string().nullable().optional(),
  footerLinks: z.array(z.object({
    label: z.string(),
    url: z.string()
  })).nullable().optional(),
  companyName: z.string().nullable().optional(),
  companyAddress: z.string().nullable().optional(),
  socialLinks: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
  }).nullable().optional(),
  primaryColor: z.string().optional(),
  senderName: z.string().nullable().optional(),
  replyToEmail: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().email().nullable().optional()
  ),
})

// Transformiert null-Werte für JSON-Felder zu Prisma.DbNull
function prepareJsonField(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === null || value === undefined) {
    return Prisma.DbNull
  }
  return value as Prisma.InputJsonValue
}

// GET - Aktuelle Email-Einstellungen abrufen
export async function GET() {
  try {
    let settings = await db.emailSettings.findUnique({
      where: { id: 'default' }
    })

    // Erstelle Default-Einstellungen falls nicht vorhanden
    if (!settings) {
      settings = await db.emailSettings.create({
        data: {
          id: 'default',
          primaryColor: '#000000'
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching email settings:', error)
    return NextResponse.json(
      { error: 'Einstellungen konnten nicht geladen werden' },
      { status: 500 }
    )
  }
}

// PUT - Email-Einstellungen aktualisieren
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const data = emailSettingsSchema.parse(body)

    // Transformiere Daten für Prisma (JSON-Felder brauchen spezielle null-Behandlung)
    const prismaData = {
      footerLogo: data.footerLogo,
      footerText: data.footerText,
      footerLinks: prepareJsonField(data.footerLinks),
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      socialLinks: prepareJsonField(data.socialLinks),
      primaryColor: data.primaryColor,
      senderName: data.senderName,
      replyToEmail: data.replyToEmail,
    }

    const settings = await db.emailSettings.upsert({
      where: { id: 'default' },
      update: prismaData,
      create: {
        id: 'default',
        ...prismaData
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Daten', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating email settings:', error)
    return NextResponse.json(
      { error: 'Einstellungen konnten nicht gespeichert werden' },
      { status: 500 }
    )
  }
}
