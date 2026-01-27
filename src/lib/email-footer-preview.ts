/**
 * Client-Side Footer-Generierung für Live-Vorschau
 * Repliziert die Server-Logik aus email-footer.ts für Echtzeit-Updates im Browser
 */

// Social Media SVG Icons (24x24px, Farbe #666)
const SOCIAL_ICONS = {
  twitter: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#666"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  linkedin: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#666"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#666"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#666"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
}

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

  // Social Links mit Icons
  const socialLinks = settings.socialLinks
  if (socialLinks && Object.values(socialLinks).some(v => v)) {
    parts.push('<div style="margin-bottom: 16px;">')
    if (socialLinks.twitter) {
      parts.push(`<a href="${socialLinks.twitter}" style="display: inline-block; margin: 0 6px;" target="_blank">
        <img src="data:image/svg+xml,${encodeURIComponent(SOCIAL_ICONS.twitter)}" alt="Twitter" width="24" height="24" style="display: block;" />
      </a>`)
    }
    if (socialLinks.linkedin) {
      parts.push(`<a href="${socialLinks.linkedin}" style="display: inline-block; margin: 0 6px;" target="_blank">
        <img src="data:image/svg+xml,${encodeURIComponent(SOCIAL_ICONS.linkedin)}" alt="LinkedIn" width="24" height="24" style="display: block;" />
      </a>`)
    }
    if (socialLinks.instagram) {
      parts.push(`<a href="${socialLinks.instagram}" style="display: inline-block; margin: 0 6px;" target="_blank">
        <img src="data:image/svg+xml,${encodeURIComponent(SOCIAL_ICONS.instagram)}" alt="Instagram" width="24" height="24" style="display: block;" />
      </a>`)
    }
    if (socialLinks.facebook) {
      parts.push(`<a href="${socialLinks.facebook}" style="display: inline-block; margin: 0 6px;" target="_blank">
        <img src="data:image/svg+xml,${encodeURIComponent(SOCIAL_ICONS.facebook)}" alt="Facebook" width="24" height="24" style="display: block;" />
      </a>`)
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
