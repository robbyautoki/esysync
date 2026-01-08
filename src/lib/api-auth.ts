import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export async function validateApiKey(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const apiKey = authHeader.slice(7) // Remove "Bearer "
  
  if (!apiKey.startsWith('sk_')) {
    return false
  }

  const hashedKey = hashApiKey(apiKey)

  const settings = await db.settings.findUnique({
    where: { id: 'default' }
  })

  return settings?.apiKey === hashedKey
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized', message: 'Invalid or missing API key' },
    { status: 401 }
  )
}

export async function withApiAuth(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const isValid = await validateApiKey(request)
  
  if (!isValid) {
    return unauthorizedResponse()
  }

  return handler()
}
