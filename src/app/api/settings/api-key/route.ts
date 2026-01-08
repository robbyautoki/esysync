import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

function generateApiKey(): string {
  return 'sk_' + crypto.randomBytes(24).toString('hex')
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// GET - Get API key info (hint only)
export async function GET() {
  const settings = await db.settings.findUnique({
    where: { id: 'default' }
  })

  return NextResponse.json({
    hasKey: !!settings?.apiKey,
    hint: settings?.apiKeyHint || null
  })
}

// POST - Generate new API key
export async function POST() {
  const newKey = generateApiKey()
  const hashedKey = hashApiKey(newKey)
  const hint = newKey.slice(-4)

  await db.settings.upsert({
    where: { id: 'default' },
    update: {
      apiKey: hashedKey,
      apiKeyHint: hint
    },
    create: {
      id: 'default',
      apiKey: hashedKey,
      apiKeyHint: hint
    }
  })

  // Return the plain key (only shown once!)
  return NextResponse.json({
    key: newKey,
    hint: hint,
    message: 'Speichere diesen Key sicher - er wird nur einmal angezeigt!'
  })
}

// DELETE - Revoke API key
export async function DELETE() {
  await db.settings.update({
    where: { id: 'default' },
    data: {
      apiKey: null,
      apiKeyHint: null
    }
  })

  return NextResponse.json({ success: true })
}
