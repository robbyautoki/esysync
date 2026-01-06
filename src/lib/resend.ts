import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const RESEND_DOMAIN = process.env.RESEND_DOMAIN || 'mail.example.com'
export const FROM_EMAIL = `EsySync <noreply@${RESEND_DOMAIN}>`

interface SendEmailParams {
  to: string
  subject: string
  html: string
  trackingId?: string
}

export async function sendEmail({ to, subject, html, trackingId }: SendEmailParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // Add tracking pixel
  let trackedHtml = html
  if (trackingId) {
    const trackingPixel = `<img src="${appUrl}/api/track/open?id=${trackingId}" width="1" height="1" style="display:none" />`
    trackedHtml = html + trackingPixel
  }

  // Wrap links for click tracking
  if (trackingId) {
    trackedHtml = trackedHtml.replace(
      /href="(https?:\/\/[^"]+)"/g,
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
    html: trackedHtml,
  })

  return result
}
