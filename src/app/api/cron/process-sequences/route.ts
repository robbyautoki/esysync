import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/resend'
import { canSendEmail, logEmailSent, getWarmupStatus } from '@/lib/warmup'
import { generateFooterHtml } from '@/lib/email-footer'

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

      case 'image':
        const src = node.attrs?.src || ''
        const alt = node.attrs?.alt || ''
        // Email-optimiertes Bild mit max-width und responsive Design
        return `<img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; display: block; margin: 16px 0; border-radius: 8px;" />`

      case 'imageResize':
        // Resize-Plugin speichert Bilder mit containerStyle für Größe
        const imgSrc = node.attrs?.src || ''
        const imgAlt = node.attrs?.alt || ''
        // Extrahiere width aus containerStyle (z.B. "width: 104px;")
        const containerStyle = node.attrs?.containerStyle || ''
        const widthMatch = containerStyle.match(/width:\s*(\d+)px/)
        const width = widthMatch ? widthMatch[1] : null
        const widthStyle = width ? `width: ${width}px; max-width: 100%;` : 'max-width: 100%;'
        return `<img src="${imgSrc}" alt="${imgAlt}" style="${widthStyle} height: auto; display: block; margin: 16px 0; border-radius: 8px;" />`

      case 'ctaButton':
        const btnText = node.attrs?.text || 'Button'
        const btnHref = node.attrs?.href || '#'
        const btnColor = node.attrs?.color || '#000000'
        return `<div style="margin: 24px 0;"><a href="${btnHref}" style="display: inline-block; background-color: ${btnColor}; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">${btnText}</a></div>`

      case 'spacer':
        const sizes: Record<string, string> = { small: '16px', medium: '32px', large: '48px' }
        const spacerSize = sizes[node.attrs?.size] || '32px'
        return `<div style="height: ${spacerSize};"></div>`

      case 'horizontalRule':
        return `<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />`

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

    // Check warmup limit
    const warmupStatus = await getWarmupStatus()
    let emailsRemainingToday = warmupStatus.remaining

    if (warmupStatus.enabled && !warmupStatus.isComplete && warmupStatus.remaining === 0) {
      return NextResponse.json({
        success: true,
        message: 'Daily warmup limit reached',
        warmup: {
          sentToday: warmupStatus.sentToday,
          dailyLimit: warmupStatus.dailyLimit
        }
      })
    }

    // Lade Email-Einstellungen für Footer
    const emailSettings = await db.emailSettings.findUnique({
      where: { id: 'default' }
    })

    // Find all sequence states that are due
    // Nur Sequenzen verarbeiten, deren Startdatum erreicht ist (oder kein Startdatum haben)
    const dueStates = await db.sequenceState.findMany({
      where: {
        status: 'ACTIVE',
        nextRunAt: {
          lte: now
        },
        sequence: {
          OR: [
            { scheduledStartAt: null },      // Kein Startdatum = sofort
            { scheduledStartAt: { lte: now } } // Startdatum erreicht
          ]
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
        // Skip unsubscribed leads
        if (state.lead.status === 'UNSUBSCRIBED') {
          await db.sequenceState.update({
            where: { id: state.id },
            data: { status: 'UNSUBSCRIBED' }
          })
          continue
        }

        // Check send time window (if configured)
        if (state.sequence.sendTime) {
          const [targetHour, targetMin] = state.sequence.sendTime.split(':').map(Number)
          const currentHour = now.getUTCHours()
          const currentMin = now.getUTCMinutes()
          
          // Allow 5-minute window
          const isInWindow = currentHour === targetHour && 
            currentMin >= targetMin && currentMin < targetMin + 5
          
          if (!isInWindow) {
            // Not in send window, skip for now
            continue
          }
        }

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
          const unsubscribeToken = Buffer.from(state.leadId).toString('base64url')
          
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

          // Generiere Footer aus DB-Einstellungen
          const unsubscribeLink = `${appUrl}/unsubscribe?token=${unsubscribeToken}`
          const footerHtml = generateFooterHtml(emailSettings, unsubscribeLink)

          // Wrap in email template
          const primaryColor = emailSettings?.primaryColor || '#0070f3'
          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                  a { color: ${primaryColor}; }
                </style>
              </head>
              <body>
                ${html}
                ${footerHtml}
              </body>
            </html>
          `

          const result = await sendEmail({
            to: state.lead.email,
            subject,
            html: emailHtml,
            trackingId,
            trackOpens: state.sequence.trackOpens,
            trackClicks: state.sequence.trackClicks
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
                stepIndex: state.currentStepIndex,
                subject,
                resendId: result.data?.id
              }
            }
          })

          // Log for warmup tracking
          await logEmailSent(state.leadId, subject)
          
          // Check if warmup limit reached
          if (emailsRemainingToday !== null) {
            emailsRemainingToday--
            if (emailsRemainingToday <= 0) {
              // Stop processing more emails today
              processed++
              break
            }
          }
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

    // Get updated warmup status
    const finalWarmupStatus = await getWarmupStatus()
    
    return NextResponse.json({
      success: true,
      processed,
      errors,
      total: dueStates.length,
      warmup: {
        enabled: finalWarmupStatus.enabled,
        sentToday: finalWarmupStatus.sentToday,
        dailyLimit: finalWarmupStatus.dailyLimit,
        remaining: finalWarmupStatus.remaining
      }
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
