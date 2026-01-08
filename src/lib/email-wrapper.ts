/**
 * Wraps email content in a styled HTML template (Apple Style - clean, minimal)
 */
export function wrapEmailHtml(content: string): string {
  // Transform arrow links to styled buttons
  const styledContent = transformLinksToButtons(content)
  
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 48px 24px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%;">
          <tr>
            <td>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 17px; line-height: 1.65; color: #1d1d1f; letter-spacing: -0.022em;">
                ${styledContent}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

/**
 * Transform links starting with "→" into styled buttons
 */
function transformLinksToButtons(html: string): string {
  // Match links that start with → 
  const arrowLinkRegex = /<a([^>]*href="([^"]*)"[^>]*)>→\s*([^<]+)<\/a>/gi
  
  return html.replace(arrowLinkRegex, (_, attrs, href, text) => {
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
        <tr>
          <td>
            <a href="${href}" target="_blank" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${text.trim()}</a>
          </td>
        </tr>
      </table>
    `.trim()
  })
}

/**
 * Style plain links (non-button links like unsubscribe)
 */
export function styleLinks(html: string): string {
  // Style unsubscribe links
  return html.replace(
    /<a([^>]*href="[^"]*unsubscribe[^"]*"[^>]*)>([^<]+)<\/a>/gi,
    '<a$1 style="color: #666666; font-size: 12px; text-decoration: underline;">$2</a>'
  )
}

/**
 * Full email processing pipeline
 */
export function processEmailHtml(rawHtml: string): string {
  let html = rawHtml
  
  // Add paragraph spacing
  html = html.replace(/<p>/g, '<p style="margin: 0 0 16px 0;">')
  
  // Style links
  html = styleLinks(html)
  
  // Wrap in template
  return wrapEmailHtml(html)
}
