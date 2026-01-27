/**
 * Client-Side Footer-Generierung für Live-Vorschau
 * Repliziert die Server-Logik aus email-footer.ts für Echtzeit-Updates im Browser
 */

interface FooterSettings {
  footerLogo?: string | null
  footerText?: string | null
  footerLinks?: Array<{ label: string; url: string }> | null
  companyName?: string | null
  companyAddress?: string | null
  socialLinks?: {
    twitter?: string
    linkedin?: string
    instagram?: string
    facebook?: string
  } | null
}

/**
 * Generiert HTML für den E-Mail-Footer (Client-Side Version)
 * @param settings - Aktuelle Footer-Einstellungen
 * @returns HTML-String für die Vorschau
 */
export function generateFooterPreview(settings: FooterSettings | null): string {
  // Placeholder für Abmelde-Link in der Vorschau
  const unsubscribeUrl = '#'

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

  // Social Links
  const socialLinks = settings.socialLinks
  if (socialLinks && Object.values(socialLinks).some(v => v)) {
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

  // Footer Links
  const footerLinks = settings.footerLinks
  if (footerLinks && footerLinks.length > 0) {
    parts.push('<div style="margin-bottom: 16px;">')
    footerLinks.forEach((link, i) => {
      if (i > 0) parts.push(' | ')
      parts.push(`<a href="${link.url || '#'}" style="color: #666; font-size: 12px;">${link.label || 'Link'}</a>`)
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

/**
 * Generiert komplettes HTML-Dokument für iframe-Vorschau
 */
export function generatePreviewDocument(settings: FooterSettings | null): string {
  const footerHtml = generateFooterPreview(settings)

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 16px;
        background: #fff;
      }
      a {
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div style="color: #666; font-size: 14px; text-align: center; padding: 20px; border: 1px dashed #ddd; border-radius: 4px; margin-bottom: 8px;">
      <em>E-Mail-Inhalt erscheint hier...</em>
    </div>
    ${footerHtml}
  </body>
</html>`
}
