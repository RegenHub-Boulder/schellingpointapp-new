'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle, XCircle, Calendar, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

interface InvitationInfo {
  event: {
    name: string
    slug: string
    description: string | null
    start_date: string
    end_date: string
  }
  role: string
  expires_at: string
  is_expired: boolean
  is_used: boolean
  is_revoked: boolean
}

export default function AcceptEventInvitationPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const { user, isLoading: authLoading } = useAuth()

  const [invitation, setInvitation] = React.useState<InvitationInfo | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [accepting, setAccepting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  // Fetch invitation info
  React.useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/v1/invitations/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid invitation')
          return
        }

        setInvitation(data)
      } catch {
        setError('Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  const handleAccept = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) {
      router.push(`/login?redirect=/invite/e/${token}`)
      return
    }

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation')
        return
      }

      setSuccess(data.message)

      // Redirect to event after short delay
      setTimeout(() => {
        router.push(`/e/${data.eventSlug}`)
      }, 2000)
    } catch {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild variant="outline">
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">You&apos;re In!</h2>
            <p className="text-muted-foreground mb-4">{success}</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) return null

  const isInvalid = invitation.is_expired || invitation.is_used || invitation.is_revoked

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{invitation.event.name}</CardTitle>
          <CardDescription>You&apos;ve been invited to join this event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitation.event.description && (
            <p className="text-sm text-muted-foreground">{invitation.event.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(invitation.event.start_date).toLocaleDateString()} - {new Date(invitation.event.end_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="capitalize">{invitation.role}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isInvalid ? (
            <div className="rounded-lg bg-muted p-4 text-center">
              <XCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">
                {invitation.is_expired && 'This invitation has expired'}
                {invitation.is_used && 'This invitation has already been used'}
                {invitation.is_revoked && 'This invitation has been revoked'}
              </p>
            </div>
          ) : user ? (
            <Button
              onClick={handleAccept}
              className="w-full"
              size="lg"
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Please log in or create an account to accept this invitation
              </p>
              <Button asChild className="w-full" size="lg">
                <Link href={`/login?redirect=/invite/e/${token}`}>
                  Log In to Accept
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
