'use client'

import * as React from 'react'
import { Loader2, Download, QrCode as QrCodeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TicketQRProps {
  /** Ticket ID to fetch QR for */
  ticketId: string
  /** Event slug for API calls */
  eventSlug: string
  /** Ticket tier name */
  tierName?: string
  /** Event name */
  eventName?: string
  /** Custom class name */
  className?: string
  /** Show download button */
  showDownload?: boolean
  /** Size of QR code */
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 150,
  md: 250,
  lg: 350,
}

export function TicketQR({
  ticketId,
  eventSlug,
  tierName,
  eventName,
  className,
  showDownload = true,
  size = 'md',
}: TicketQRProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const qrSize = SIZES[size]

  // Fetch QR code from API
  React.useEffect(() => {
    async function fetchQR() {
      try {
        const response = await fetch(`/api/v1/events/${eventSlug}/tickets/${ticketId}/qr`)

        if (!response.ok) {
          throw new Error('Failed to load QR code')
        }

        const data = await response.json()
        setQrDataUrl(data.qrDataUrl)
      } catch (err) {
        console.error('Error fetching QR code:', err)
        setError('Failed to load QR code')
      } finally {
        setLoading(false)
      }
    }

    fetchQR()
  }, [ticketId, eventSlug])

  const handleDownload = () => {
    if (!qrDataUrl) return

    // Create download link
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `ticket-${ticketId.slice(0, 8)}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <QrCodeIcon className="h-5 w-5" />
          {tierName || 'Event Ticket'}
        </CardTitle>
        {eventName && (
          <CardDescription>{eventName}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4">
        {loading ? (
          <div
            className="flex items-center justify-center bg-muted rounded-lg"
            style={{ width: qrSize, height: qrSize }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div
            className="flex items-center justify-center bg-destructive/10 text-destructive rounded-lg p-4"
            style={{ width: qrSize, height: qrSize }}
          >
            <p className="text-sm text-center">{error}</p>
          </div>
        ) : qrDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Ticket QR Code"
              width={qrSize}
              height={qrSize}
              className="rounded-lg"
            />
            <p className="text-xs text-muted-foreground text-center">
              Show this QR code at check-in
            </p>
          </>
        ) : (
          <div
            className="flex items-center justify-center bg-muted rounded-lg"
            style={{ width: qrSize, height: qrSize }}
          >
            <p className="text-sm text-muted-foreground">QR code not available</p>
          </div>
        )}

        {showDownload && qrDataUrl && (
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download QR
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Inline QR code display (without card wrapper)
 */
export function TicketQRInline({
  qrDataUrl,
  size = 200,
  className,
}: {
  qrDataUrl: string
  size?: number
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qrDataUrl}
      alt="Ticket QR Code"
      width={size}
      height={size}
      className={cn('rounded-lg', className)}
    />
  )
}
