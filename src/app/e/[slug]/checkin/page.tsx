'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, AlertTriangle, Users, UserCheck, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useEvent } from '@/contexts/EventContext'
import { useEventRole } from '@/contexts/EventContext'
import { cn } from '@/lib/utils'

// Dynamic import to avoid SSR issues with camera
const QRScanner = dynamic(
  () => import('@/components/QRScanner').then(mod => mod.QRScanner),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] bg-muted rounded-lg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
)

interface CheckInResult {
  success: boolean
  error?: string
  code?: string
  attendee?: {
    name: string
    email?: string
    avatarUrl?: string
    tierName?: string
    ticketId?: string
  }
  checkedInAt?: string
}

interface CheckInStats {
  total: number
  checkedIn: number
  pending: number
}

function getAccessToken(): string | null {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    try {
      const session = JSON.parse(stored)
      return session?.access_token || null
    } catch {
      return null
    }
  }
  return null
}

export default function CheckInPage() {
  const router = useRouter()
  const { user } = useAuth()
  const event = useEvent()
  const { role, isAdmin } = useEventRole()

  const [scanning, setScanning] = React.useState(true)
  const [lastResult, setLastResult] = React.useState<CheckInResult | null>(null)
  const [processing, setProcessing] = React.useState(false)
  const [stats, setStats] = React.useState<CheckInStats | null>(null)
  const [lastScannedCode, setLastScannedCode] = React.useState<string | null>(null)

  // Check permissions
  const canCheckIn = isAdmin || role === 'volunteer'

  // Fetch stats
  const fetchStats = React.useCallback(async () => {
    const token = getAccessToken()
    if (!token) return

    try {
      const response = await fetch(`/api/v1/events/${event.slug}/checkin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [event.slug])

  React.useEffect(() => {
    if (canCheckIn) {
      fetchStats()
    }
  }, [canCheckIn, fetchStats])

  const handleScan = React.useCallback(async (qrToken: string) => {
    // Debounce - don't scan same code twice in a row
    if (qrToken === lastScannedCode || processing) return

    setLastScannedCode(qrToken)
    setProcessing(true)
    setScanning(false) // Pause scanner while processing

    try {
      const token = getAccessToken()
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/v1/events/${event.slug}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qrToken }),
      })

      const data = await response.json()

      if (response.ok) {
        setLastResult({
          success: true,
          attendee: data.attendee,
        })
        // Refresh stats
        fetchStats()
      } else {
        setLastResult({
          success: false,
          error: data.error,
          code: data.code,
          attendee: data.attendee,
          checkedInAt: data.checkedInAt,
        })
      }
    } catch (err) {
      console.error('Check-in error:', err)
      setLastResult({
        success: false,
        error: 'Failed to process check-in',
      })
    } finally {
      setProcessing(false)
    }
  }, [event.slug, lastScannedCode, processing, router, fetchStats])

  const handleContinue = () => {
    setLastResult(null)
    setLastScannedCode(null)
    setScanning(true)
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to use the check-in scanner.
            </p>
            <Button onClick={() => router.push('/login')}>Log In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!canCheckIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don&apos;t have permission to check in attendees. Contact an event admin if you should have access.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Check-In Scanner</h1>
          <p className="text-muted-foreground">{event.name}</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <p className="text-2xl font-bold">{stats.checkedIn}</p>
                <p className="text-xs text-muted-foreground">Checked In</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <UserCheck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Result display */}
        {lastResult && (
          <Card className={cn(
            'border-2',
            lastResult.success ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
              lastResult.code === 'ALREADY_CHECKED_IN' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' :
                'border-red-500 bg-red-50 dark:bg-red-950/20'
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                {lastResult.success ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="text-green-600">Check-In Successful</span>
                  </>
                ) : lastResult.code === 'ALREADY_CHECKED_IN' ? (
                  <>
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                    <span className="text-amber-600">Already Checked In</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-red-600" />
                    <span className="text-red-600">Check-In Failed</span>
                  </>
                )}
              </CardTitle>
              {lastResult.error && !lastResult.success && (
                <CardDescription className="text-red-600">
                  {lastResult.error}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent>
              {lastResult.attendee && (
                <div className="flex items-center gap-3 mb-4">
                  {lastResult.attendee.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lastResult.attendee.avatarUrl}
                      alt=""
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-lg font-medium">
                        {lastResult.attendee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{lastResult.attendee.name}</p>
                    {lastResult.attendee.email && (
                      <p className="text-sm text-muted-foreground">{lastResult.attendee.email}</p>
                    )}
                    {lastResult.attendee.tierName && (
                      <p className="text-sm text-muted-foreground">{lastResult.attendee.tierName}</p>
                    )}
                  </div>
                </div>
              )}

              {lastResult.checkedInAt && (
                <p className="text-sm text-muted-foreground mb-4">
                  Previously checked in: {new Date(lastResult.checkedInAt).toLocaleString()}
                </p>
              )}

              <Button onClick={handleContinue} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Scan Next
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scanner */}
        {!lastResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Point the camera at an attendee&apos;s ticket QR code
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processing ? (
                <div className="w-full h-[300px] bg-muted rounded-lg flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-muted-foreground">Processing...</p>
                </div>
              ) : (
                <QRScanner
                  onScan={handleScan}
                  paused={!scanning}
                  onError={(err) => console.error('Scanner error:', err)}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual entry hint */}
        <p className="text-center text-sm text-muted-foreground">
          Having trouble? Ask the attendee to show their ticket in the app.
        </p>
      </div>
    </div>
  )
}
