'use client'

import * as React from 'react'
import { User, X, Copy, Check, Loader2, Plus, LogOut, Link2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

function authHeaders(): HeadersInit {
  const token = getAccessToken()
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

interface Cohost {
  user_id: string
  display_order: number
  profile: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface Invite {
  id: string
  token: string
  status: string
  expires_at: string
  created_at: string
}

interface ManageCohostsSectionProps {
  sessionId: string
  hostId: string
  userId: string
  isAdmin: boolean
  cohosts: Cohost[]
  onCohostsChange: () => void
}

export function ManageCohostsSection({
  sessionId,
  hostId,
  userId,
  isAdmin,
  cohosts,
  onCohostsChange,
}: ManageCohostsSectionProps) {
  const [invites, setInvites] = React.useState<Invite[]>([])
  const [isLoadingInvites, setIsLoadingInvites] = React.useState(false)
  const [isCreatingInvite, setIsCreatingInvite] = React.useState(false)
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null)
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const [revokingId, setRevokingId] = React.useState<string | null>(null)
  const [isLeaving, setIsLeaving] = React.useState(false)

  const isPrimaryHost = hostId === userId
  const isCohost = cohosts.some(c => c.user_id === userId)
  const canManage = isPrimaryHost || isAdmin

  // Fetch invites for primary host / admin
  React.useEffect(() => {
    if (!canManage) return
    fetchInvites()
  }, [canManage, sessionId])

  const fetchInvites = async () => {
    setIsLoadingInvites(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/invites`, {
        headers: authHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setInvites(data.filter((i: Invite) => i.status === 'pending'))
      }
    } catch (err) {
      console.error('Error fetching invites:', err)
    } finally {
      setIsLoadingInvites(false)
    }
  }

  const handleCreateInvite = async () => {
    setIsCreatingInvite(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/invites`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (response.ok) {
        await fetchInvites()
      }
    } catch (err) {
      console.error('Error creating invite:', err)
    } finally {
      setIsCreatingInvite(false)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingId(inviteId)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/invites/${inviteId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (response.ok) {
        setInvites(prev => prev.filter(i => i.id !== inviteId))
      }
    } catch (err) {
      console.error('Error revoking invite:', err)
    } finally {
      setRevokingId(null)
    }
  }

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleRemoveCohost = async (cohostUserId: string) => {
    setRemovingId(cohostUserId)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/cohosts/${cohostUserId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (response.ok) {
        onCohostsChange()
      }
    } catch (err) {
      console.error('Error removing co-host:', err)
    } finally {
      setRemovingId(null)
    }
  }

  const handleLeave = async () => {
    setIsLeaving(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/cohosts/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (response.ok) {
        onCohostsChange()
      }
    } catch (err) {
      console.error('Error leaving:', err)
    } finally {
      setIsLeaving(false)
    }
  }

  // Co-host view: just a leave button
  if (isCohost && !canManage) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Co-Host</h3>
        <p className="text-sm text-muted-foreground mb-3">
          You are a co-host of this session.
        </p>
        <Button
          variant="outline"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLeave}
          disabled={isLeaving}
        >
          {isLeaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          Leave as Co-Host
        </Button>
      </Card>
    )
  }

  // Primary host / admin view: full management
  if (!canManage) return null

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Co-Hosts</h3>

      {/* Current co-hosts */}
      {cohosts.length > 0 ? (
        <div className="space-y-2 mb-4">
          {cohosts.map(cohost => (
            <div key={cohost.user_id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {cohost.profile?.avatar_url ? (
                    <img src={cohost.profile.avatar_url} alt={cohost.profile.display_name || ''} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm truncate">{cohost.profile?.display_name || 'Unknown'}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveCohost(cohost.user_id)}
                disabled={removingId === cohost.user_id}
              >
                {removingId === cohost.user_id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">No co-hosts yet</p>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-muted-foreground">Pending Invites</p>
          {invites.map(invite => (
            <div key={invite.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-dashed">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  Expires {new Date(invite.expires_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleCopyLink(invite.token)}
                  title="Copy invite link"
                >
                  {copiedToken === invite.token ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRevokeInvite(invite.id)}
                  disabled={revokingId === invite.id}
                  title="Revoke invite"
                >
                  {revokingId === invite.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create invite button */}
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={handleCreateInvite}
        disabled={isCreatingInvite}
      >
        {isCreatingInvite ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        Create Invite Link
      </Button>
    </Card>
  )
}
