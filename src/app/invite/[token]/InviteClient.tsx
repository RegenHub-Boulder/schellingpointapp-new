'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mic, Wrench, MessageSquare, Users, Monitor, User, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getAccessToken(): string | null {
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

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

interface InviteData {
  id: string
  status: string
  expires_at: string
  session: {
    id: string
    title: string
    description: string | null
    format: string
    duration: number
    host_name: string | null
    host: { id: string; display_name: string | null; avatar_url: string | null } | null
  }
}

interface InviteClientProps {
  token: string
  invite: InviteData | null
}

export function InviteClient({ token, invite }: InviteClientProps) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [accepted, setAccepted] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (!invite || !invite.session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Invite Not Found</CardTitle>
            <CardDescription>
              This invite link is invalid or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/sessions">Browse Sessions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const session = invite.session as any
  const FormatIcon = formatIcons[session.format] || Mic

  // Invite is not pending
  if (invite.status !== 'pending') {
    const statusConfig = {
      accepted: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', message: 'This invite has already been accepted.' },
      expired: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', message: 'This invite has expired.' },
      revoked: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', message: 'This invite has been revoked.' },
    }
    const config = statusConfig[invite.status as keyof typeof statusConfig] || statusConfig.expired
    const StatusIcon = config.icon

    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`rounded-full ${config.bg} p-4`}>
                <StatusIcon className={`h-12 w-12 ${config.color}`} />
              </div>
            </div>
            <CardTitle className="text-2xl">{session.title}</CardTitle>
            <CardDescription>{config.message}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href={`/sessions/${session.id}`}>View Session</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Accepted state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-500/10 p-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">You're a Co-Host!</CardTitle>
            <CardDescription>
              You've been added as a co-host for "{session.title}". You can now edit this session.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href={`/sessions/${session.id}`}>View Session</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleAccept = async () => {
    setIsAccepting(true)
    setError(null)

    try {
      const accessToken = getAccessToken()
      const response = await fetch(`/api/invite/${token}/accept`, {
        method: 'POST',
        headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          // Already a co-host — redirect to session
          router.push(`/sessions/${data.session_id}`)
          return
        }
        setError(data.error || 'Failed to accept invite')
        return
      }

      setAccepted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsAccepting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardDescription className="mb-2">You've been invited to co-host</CardDescription>
          <CardTitle className="text-2xl">{session.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Session preview */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FormatIcon className="h-4 w-4" />
              <span className="capitalize">{session.format}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{session.duration} min</span>
            </div>

            {session.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {session.description}
              </p>
            )}

            {/* Primary host */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {session.host?.avatar_url ? (
                  <img
                    src={session.host.avatar_url}
                    alt={session.host.display_name || session.host_name || ''}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                Hosted by {session.host?.display_name || session.host_name || 'Unknown'}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {authLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : user ? (
            <Button className="w-full" onClick={handleAccept} disabled={isAccepting}>
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Co-Host Invitation'
              )}
            </Button>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to accept this invitation
              </p>
              <Button asChild className="w-full">
                <Link href={`/login?redirect=/invite/${token}`}>
                  Sign In to Accept
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
