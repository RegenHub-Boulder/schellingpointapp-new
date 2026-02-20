import * as jose from 'jose'
import QRCode from 'qrcode'

// JWT secret for ticket QR codes
const JWT_SECRET = new TextEncoder().encode(
  process.env.TICKET_QR_SECRET || process.env.NEXTAUTH_SECRET || 'ticket-qr-secret-key'
)

// JWT expiration (90 days)
const JWT_EXPIRATION = '90d'

// Ticket QR payload
export interface TicketQRPayload {
  ticketId: string
  eventId: string
  userId: string
  tierId: string
  issuedAt: number
}

/**
 * Generate a signed JWT for a ticket
 */
export async function generateTicketToken(payload: Omit<TicketQRPayload, 'issuedAt'>): Promise<string> {
  const jwt = await new jose.SignJWT({
    ticketId: payload.ticketId,
    eventId: payload.eventId,
    userId: payload.userId,
    tierId: payload.tierId,
    issuedAt: Date.now(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .setSubject(payload.ticketId)
    .sign(JWT_SECRET)

  return jwt
}

/**
 * Verify and decode a ticket JWT
 */
export async function verifyTicketToken(token: string): Promise<TicketQRPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET)

    return {
      ticketId: payload.ticketId as string,
      eventId: payload.eventId as string,
      userId: payload.userId as string,
      tierId: payload.tierId as string,
      issuedAt: payload.issuedAt as number,
    }
  } catch {
    return null
  }
}

/**
 * Generate a QR code data URL for a ticket
 */
export async function generateTicketQRCode(token: string): Promise<string> {
  try {
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(token, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

    return qrDataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate QR code as SVG string (for embedding)
 */
export async function generateTicketQRSVG(token: string): Promise<string> {
  try {
    const svg = await QRCode.toString(token, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
    })

    return svg
  } catch (error) {
    console.error('Error generating QR SVG:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate and update ticket with QR code
 * Call this after ticket is confirmed
 */
export async function generateAndStoreTicketQR(
  ticket: {
    id: string
    event_id: string
    user_id: string
    tier_id: string
  }
): Promise<string> {
  const token = await generateTicketToken({
    ticketId: ticket.id,
    eventId: ticket.event_id,
    userId: ticket.user_id,
    tierId: ticket.tier_id,
  })

  return token
}
