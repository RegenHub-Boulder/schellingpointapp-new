interface SessionScheduledEmailParams {
  sessionTitle: string
  hostName: string
  venueName: string
  venueAddress: string | null
  dateString: string
  timeString: string
  trackName: string | null
  trackColor: string | null
  sessionUrl: string
}

export function buildSessionScheduledEmail(params: SessionScheduledEmailParams) {
  const {
    sessionTitle,
    hostName,
    venueName,
    venueAddress,
    dateString,
    timeString,
    trackName,
    trackColor,
    sessionUrl,
  } = params

  const subject = `Your session "${sessionTitle}" has been scheduled! — EthBoulder 2026`

  const trackDot = trackName
    ? `<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${trackColor || '#B2FF00'}; margin-right: 6px; vertical-align: middle;"></span>${trackName}`
    : null

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Session Scheduled</title>
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
    Your session "${sessionTitle}" has been scheduled for ${dateString} at ${venueName}
  </div>

  <!-- Wrapper table -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0a0e14;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Main container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px; background-color: #0d1117; border-radius: 16px; border: 1px solid #1e2a3a; overflow: hidden;">

          <!-- Header with logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 24px 40px; background: linear-gradient(180deg, #111820 0%, #0d1117 100%);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <img src="https://schellingpointapp-new.vercel.app/logo.png" alt="Schelling Point" width="56" height="56" style="display: block; border: 0;">
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      Session Scheduled!
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
            <td style="padding: 32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 15px; line-height: 24px; color: #c9d1d9;">
                      Hey ${hostName},
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #c9d1d9;">
                      Great news! Your session has been added to the official schedule.
                    </p>
                  </td>
                </tr>

                <!-- Session Title -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 28px;">
                      ${sessionTitle}
                    </h2>
                  </td>
                </tr>

                <!-- Details Grid -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #161b22; border-radius: 8px; border: 1px solid #21262d;">
                      <tr>
                        <td style="padding: 16px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <!-- Date -->
                            <tr>
                              <td style="padding: 4px 0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="width: 80px; font-size: 13px; color: #8b949e; vertical-align: top; padding: 2px 0;">Date</td>
                                    <td style="font-size: 14px; color: #ffffff; font-weight: 500; padding: 2px 0;">${dateString}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <!-- Time -->
                            <tr>
                              <td style="padding: 4px 0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="width: 80px; font-size: 13px; color: #8b949e; vertical-align: top; padding: 2px 0;">Time</td>
                                    <td style="font-size: 14px; color: #ffffff; font-weight: 500; padding: 2px 0;">${timeString}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <!-- Venue -->
                            <tr>
                              <td style="padding: 4px 0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="width: 80px; font-size: 13px; color: #8b949e; vertical-align: top; padding: 2px 0;">Venue</td>
                                    <td style="font-size: 14px; color: #ffffff; font-weight: 500; padding: 2px 0;">
                                      ${venueName}${venueAddress ? `<br><span style="font-size: 12px; color: #8b949e; font-weight: 400;">${venueAddress}</span>` : ''}
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            ${trackDot ? `<!-- Track -->
                            <tr>
                              <td style="padding: 4px 0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="width: 80px; font-size: 13px; color: #8b949e; vertical-align: top; padding: 2px 0;">Track</td>
                                    <td style="font-size: 14px; color: #ffffff; font-weight: 500; padding: 2px 0;">${trackDot}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-radius: 8px; background-color: #B2FF00;">
                          <a href="${sessionUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #0a0e14; text-decoration: none; border-radius: 8px;">
                            View Your Session
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Note -->
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 13px; line-height: 20px; color: #8b949e;">
                      You can edit your session details, add a Telegram group link, or invite co-hosts from your session page.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #0a0e14; border-top: 1px solid #1e2a3a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #6e7681;">
                      <strong style="color: #8b949e;">EthBoulder 2026</strong> &nbsp;&#8226;&nbsp; February 13-15 &nbsp;&#8226;&nbsp; Boulder, CO
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #484f58;">
                      Where the Ethereum community comes together
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

  return { subject, html }
}
