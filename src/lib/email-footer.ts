/**
 * Wiederverwendbare Footer-Generierung für E-Mails
 * Verwendet von: Cron-Route, Test-Email-Route
 */

// Flexibles Interface das sowohl mit Prisma-Typen als auch direkten Objekten funktioniert
interface EmailSettings {
  footerLogo?: string | null
  footerText?: string | null
  footerLinks?: unknown // Prisma JsonValue - wird zur Laufzeit geprüft
  companyName?: string | null
  companyAddress?: string | null
  socialLinks?: unknown // Prisma JsonValue - wird zur Laufzeit geprüft
  primaryColor?: string
  senderName?: string | null
  replyToEmail?: string | null
}

interface FooterLink {
  label: string
  url: string
}

interface SocialLinks {
  twitter?: string
  linkedin?: string
  instagram?: string
  facebook?: string
}

/**
 * Generiert HTML für den E-Mail-Footer basierend auf den Einstellungen
 * @param settings - Email-Einstellungen aus der DB
 * @param unsubscribeLink - Optional: Konkreter Abmelde-Link (sonst {{unsubscribe_link}} Placeholder)
 */
export function generateFooterHtml(
  settings: EmailSettings | null,
  unsubscribeLink?: string
): string {
  const unsubscribeUrl = unsubscribeLink || '{{unsubscribe_link}}'

  if (!settings) {
    // Minimaler Footer wenn keine Einstellungen
    return `
      <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #666; text-align: center;">
        <a href="${unsubscribeUrl}" style="color: #666;">Abmelden</a>
      </p>
    `
  }

  const parts: string[] = []

  parts.push('<hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">')
  parts.push('<div style="padding: 20px 0; text-align: center;">')

  // Logo
  if (settings.footerLogo) {
    parts.push(`
      <div style="margin-bottom: 16px;">
        <img src="${settings.footerLogo}" alt="Logo" style="max-height: 50px; max-width: 150px;">
      </div>
    `)
  }

  // Social Links - cast von Prisma JsonValue
  const socialLinks = settings.socialLinks as SocialLinks | null
  if (socialLinks && typeof socialLinks === 'object' && Object.values(socialLinks).some(v => v)) {
    parts.push('<div style="margin-bottom: 16px;">')
    if (socialLinks.twitter) {
      parts.push(`<a href="${socialLinks.twitter}" style="margin: 0 8px; color: #666;">Twitter</a>`)
    }
    if (socialLinks.linkedin) {
      parts.push(`<a href="${socialLinks.linkedin}" style="margin: 0 8px; color: #666;">LinkedIn</a>`)
    }
    if (socialLinks.instagram) {
      parts.push(`<a href="${socialLinks.instagram}" style="margin: 0 8px; color: #666;">Instagram</a>`)
    }
    if (socialLinks.facebook) {
      parts.push(`<a href="${socialLinks.facebook}" style="margin: 0 8px; color: #666;">Facebook</a>`)
    }
    parts.push('</div>')
  }

  // Footer Links - cast von Prisma JsonValue
  const footerLinks = settings.footerLinks as FooterLink[] | null
  if (footerLinks && Array.isArray(footerLinks) && footerLinks.length > 0) {
    parts.push('<div style="margin-bottom: 16px;">')
    footerLinks.forEach((link, i) => {
      if (i > 0) parts.push(' | ')
      parts.push(`<a href="${link.url}" style="color: #666; font-size: 12px;">${link.label}</a>`)
    })
    parts.push('</div>')
  }

  // Company Info
  if (settings.companyName || settings.companyAddress) {
    parts.push('<div style="font-size: 12px; color: #999; margin-bottom: 8px;">')
    if (settings.companyName) parts.push(`<strong>${settings.companyName}</strong><br>`)
    if (settings.companyAddress) parts.push(settings.companyAddress.replace(/\n/g, '<br>'))
    parts.push('</div>')
  }

  // Footer Text
  if (settings.footerText) {
    parts.push(`<p style="font-size: 12px; color: #999; margin: 8px 0;">${settings.footerText}</p>`)
  }

  // Unsubscribe Link (immer vorhanden)
  parts.push(`
    <p style="font-size: 12px; color: #999; margin-top: 16px;">
      <a href="${unsubscribeUrl}" style="color: #999;">Abmelden</a>
    </p>
  `)

  parts.push('</div>')

  return parts.join('')
}
