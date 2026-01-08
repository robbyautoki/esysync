import { Resend } from 'resend'
import { processEmailHtml } from './email-wrapper'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const RESEND_DOMAIN = process.env.RESEND_DOMAIN || 'mail.example.com'
export const FROM_EMAIL = `EsySync <noreply@${RESEND_DOMAIN}>`

interface SendEmailParams {
  to: string
  subject: string
  html: string
  trackingId?: string
  skipWrapper?: boolean
}

export async function sendEmail({ to, subject, html, trackingId, skipWrapper = false }: SendEmailParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // Apply styled HTML wrapper
  let processedHtml = skipWrapper ? html : processEmailHtml(html)
  
  // Add tracking pixel
  if (trackingId) {
    const trackingPixel = `<img src="${appUrl}/api/track/open?id=${trackingId}" width="1" height="1" style="display:none" alt="" />`
    // Insert before closing body tag
    processedHtml = processedHtml.replace('</body>', trackingPixel + '</body>')
  }

  // Wrap links for click tracking (but not unsubscribe links)
  if (trackingId) {
    processedHtml = processedHtml.replace(
      /href="(https?:\/\/(?!.*unsubscribe)[^"]+)"/g,
      (match, url) => {
        const encodedUrl = encodeURIComponent(url)
        return `href="${appUrl}/api/track/click?id=${trackingId}&url=${encodedUrl}"`
      }
    )
  }

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: processedHtml,
  })

  return result
}
