import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'
import { generateFooterHtml } from '@/lib/email-footer'

const testSchema = z.object({
  to: z.string().email()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to } = testSchema.parse(body)

    // Hole Email-Einstellungen
    const settings = await db.emailSettings.findUnique({
      where: { id: 'default' }
    })

    // Erstelle Test-HTML mit Footer (mit Beispiel-Abmelde-Link)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const footerHtml = generateFooterHtml(settings, `${appUrl}/unsubscribe?token=test`)

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            a { color: ${settings?.primaryColor || '#0070f3'}; }
          </style>
        </head>
        <body>
          <h1>Test-Email</h1>
          <p>Dies ist eine Test-Email um deinen Footer zu überprüfen.</p>
          <p>Hier würde der Inhalt deiner E-Mail stehen...</p>
          ${footerHtml}
        </body>
      </html>
    `

    const result = await sendEmail({
      to,
      subject: '[TEST] Footer-Vorschau',
      html
    })

    if (result.error) {
      throw new Error(result.error.message)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: error.message || 'Email konnte nicht gesendet werden' },
      { status: 500 }
    )
  }
}
