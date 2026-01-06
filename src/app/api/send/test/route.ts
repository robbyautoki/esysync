import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const testEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  content: z.any()
})

// Convert TipTap JSON to HTML
function contentToHtml(content: any): string {
  if (!content || !content.content) return ''
  
  const renderNode = (node: any): string => {
    switch (node.type) {
      case 'paragraph':
        const pContent = node.content?.map(renderNode).join('') || ''
        return `<p>${pContent}</p>`
      
      case 'heading':
        const level = node.attrs?.level || 1
        const hContent = node.content?.map(renderNode).join('') || ''
        return `<h${level}>${hContent}</h${level}>`
      
      case 'text':
        let text = node.text || ''
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === 'bold') text = `<strong>${text}</strong>`
            if (mark.type === 'italic') text = `<em>${text}</em>`
            if (mark.type === 'link') text = `<a href="${mark.attrs.href}">${text}</a>`
          }
        }
        return text
      
      case 'bulletList':
        const ulItems = node.content?.map(renderNode).join('') || ''
        return `<ul>${ulItems}</ul>`
      
      case 'orderedList':
        const olItems = node.content?.map(renderNode).join('') || ''
        return `<ol>${olItems}</ol>`
      
      case 'listItem':
        const liContent = node.content?.map(renderNode).join('') || ''
        return `<li>${liContent}</li>`
      
      case 'hardBreak':
        return '<br>'
      
      default:
        if (node.content) {
          return node.content.map(renderNode).join('')
        }
        return ''
    }
  }
  
  return content.content.map(renderNode).join('')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = testEmailSchema.parse(body)

    // Convert content to HTML
    let html = contentToHtml(data.content)

    // Replace variables with test data
    const testData = {
      firstName: 'Test',
      email: data.to,
      unsubscribe_link: '#'
    }

    let subject = data.subject
    for (const [key, value] of Object.entries(testData)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value)
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }

    // Wrap in basic email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            a { color: #0070f3; }
            h1, h2, h3 { margin-top: 1em; margin-bottom: 0.5em; }
            p { margin: 0.5em 0; }
            ul, ol { padding-left: 1.5em; }
          </style>
        </head>
        <body>
          ${html}
          <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            Dies ist eine Test-E-Mail von EsySync.
          </p>
        </body>
      </html>
    `

    const result = await sendEmail({
      to: data.to,
      subject: `[TEST] ${subject}`,
      html: emailHtml
    })

    if (result.error) {
      throw new Error(result.error.message)
    }

    return NextResponse.json({ success: true, id: result.data?.id })
  } catch (error: any) {
    console.error('Send test email error:', error)
    return NextResponse.json(
      { error: error.message || 'E-Mail konnte nicht gesendet werden' },
      { status: 500 }
    )
  }
}
