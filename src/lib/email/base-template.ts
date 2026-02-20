/**
 * Base email template with event branding
 * Used by all notification emails for consistent styling
 */

export interface BaseEmailParams {
  eventName: string
  eventLogoUrl?: string
  eventDateRange?: string
  eventLocation?: string
  previewText: string
  heading: string
  bodyHtml: string
  ctaUrl?: string
  ctaText?: string
  footerNote?: string
}

export function buildBaseEmail(params: BaseEmailParams): string {
  const {
    eventName,
    eventLogoUrl,
    eventDateRange,
    eventLocation,
    previewText,
    heading,
    bodyHtml,
    ctaUrl,
    ctaText,
    footerNote,
  } = params

  // Default logo fallback
  const logoHtml = eventLogoUrl
    ? `<img src="${eventLogoUrl}" alt="${eventName}" width="48" height="48" style="display: block; border: 0; border-radius: 8px;">`
    : `<div style="width: 48px; height: 48px; border-radius: 8px; background-color: #B2FF00; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #0a0e14;">${eventName.charAt(0)}</div>`

  // CTA button HTML
  const ctaHtml = ctaUrl && ctaText
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
        <tr>
          <td style="border-radius: 8px; background-color: #B2FF00;">
            <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #0a0e14; text-decoration: none; border-radius: 8px;">
              ${ctaText}
            </a>
          </td>
        </tr>
      </table>
    `
    : ''

  // Footer note HTML
  const footerNoteHtml = footerNote
    ? `<p style="margin: 16px 0 0 0; font-size: 13px; line-height: 20px; color: #8b949e;">${footerNote}</p>`
    : ''

  // Event info in footer
  const eventInfoHtml = `
    <strong style="color: #8b949e;">${eventName}</strong>
    ${eventDateRange ? ` &nbsp;&#8226;&nbsp; ${eventDateRange}` : ''}
    ${eventLocation ? ` &nbsp;&#8226;&nbsp; ${eventLocation}` : ''}
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${heading}</title>
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
<body style="margin: 0; padding: 0; background-color: #0a0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Preview text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>

  <!-- Wrapper table -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0a0e14;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Main container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px; background-color: #0d1117; border-radius: 16px; border: 1px solid #1e2a3a; overflow: hidden;">

          <!-- Header with logo -->
          <tr>
            <td align="center" style="padding: 32px 40px 20px 40px; background: linear-gradient(180deg, #111820 0%, #0d1117 100%);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 16px;">
                    ${logoHtml}
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      ${heading}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider line with glow effect -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height: 1px; background: linear-gradient(90deg, transparent 0%, #B2FF00 50%, transparent 100%);"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 28px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size: 15px; line-height: 24px; color: #c9d1d9;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              ${ctaHtml}

              <!-- Footer note -->
              ${footerNoteHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #0a0e14; border-top: 1px solid #1e2a3a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 13px; color: #6e7681;">
                      ${eventInfoHtml}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End main container -->

        <!-- Bottom spacing and link -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px;">
          <tr>
            <td align="center" style="padding: 24px 20px;">
              <p style="margin: 0; font-size: 11px; color: #484f58;">
                Powered by <a href="https://schellingpoint.city" style="color: #6e7681; text-decoration: none;">Schelling Point</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
}
