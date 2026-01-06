import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/resend'

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

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    
    // Find all sequence states that are due
    const dueStates = await db.sequenceState.findMany({
      where: {
        status: 'ACTIVE',
        nextRunAt: {
          lte: now
        }
      },
      include: {
        lead: true,
        sequence: {
          include: {
            steps: {
              orderBy: { order: 'asc' }
            }
          }
        }
      },
      take: 50 // Process in batches
    })

    let processed = 0
    let errors = 0

    for (const state of dueStates) {
      try {
        const currentStep = state.sequence.steps[state.currentStepIndex]
        
        if (!currentStep) {
          // Sequence completed
          await db.sequenceState.update({
            where: { id: state.id },
            data: {
              status: 'COMPLETED',
              completedAt: now
            }
          })
          continue
        }

        if (currentStep.type === 'EMAIL') {
          // Send email
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const trackingId = `${state.leadId}_${state.sequenceId}_${currentStep.id}`
          const unsubscribeToken = Buffer.from(state.leadId).toString('base64')
          
          // Prepare content
          let html = contentToHtml(currentStep.content)
          let subject = currentStep.subject || 'Nachricht'

          // Replace variables
          const customFields = state.lead.customFields as Record<string, string> | null
          const variables: Record<string, string> = {
            firstName: state.lead.firstName,
            email: state.lead.email,
            unsubscribe_link: `${appUrl}/unsubscribe?token=${unsubscribeToken}`,
            ...(customFields || {})
          }

          for (const [key, value] of Object.entries(variables)) {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value)
            subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value)
          }

          // Wrap in email template
          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                  a { color: #0070f3; }
                </style>
              </head>
              <body>
                ${html}
                <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #666;">
                  <a href="${appUrl}/unsubscribe?token=${unsubscribeToken}">Abmelden</a>
                </p>
              </body>
            </html>
          `

          const result = await sendEmail({
            to: state.lead.email,
            subject,
            html: emailHtml,
            trackingId
          })

          if (result.error) {
            throw new Error(result.error.message)
          }

          // Log event
          await db.event.create({
            data: {
              leadId: state.leadId,
              type: 'EMAIL_SENT',
              metadata: {
                sequenceId: state.sequenceId,
                stepId: currentStep.id,
                subject,
                resendId: result.data?.id
              }
            }
          })
        }

        // Move to next step
        const nextStepIndex = state.currentStepIndex + 1
        const nextStep = state.sequence.steps[nextStepIndex]

        if (nextStep) {
          // Calculate next run time
          let nextRunAt = new Date()
          
          if (nextStep.type === 'DELAY') {
            const delayMs = getDelayMs(nextStep.delayValue || 1, nextStep.delayUnit || 'days')
            nextRunAt = new Date(now.getTime() + delayMs)
          }

          await db.sequenceState.update({
            where: { id: state.id },
            data: {
              currentStepIndex: nextStepIndex,
              nextRunAt
            }
          })
        } else {
          // Sequence completed
          await db.sequenceState.update({
            where: { id: state.id },
            data: {
              status: 'COMPLETED',
              completedAt: now
            }
          })
        }

        processed++
      } catch (error) {
        console.error(`Error processing state ${state.id}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      total: dueStates.length
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    )
  }
}

function getDelayMs(value: number, unit: string): number {
  switch (unit) {
    case 'minutes':
      return value * 60 * 1000
    case 'hours':
      return value * 60 * 60 * 1000
    case 'days':
      return value * 24 * 60 * 60 * 1000
    default:
      return value * 24 * 60 * 60 * 1000
  }
}
