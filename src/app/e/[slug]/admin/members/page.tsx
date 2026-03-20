'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Users,
  UserPlus,
  Mail,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AdminNav } from '@/components/admin/AdminNav'
import { useAuth } from '@/hooks/useAuth'
import { useEvent, useEventRole } from '@/contexts/EventContext'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface Member {
  id: string
  user_id: string
  role: string
  joined_at: string
  user_data: {
    display_name: string | null
    email: string | null
  } | null
}

interface Invitation {
  id: string
  token: string
  email: string | null
  role: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-500',
  admin: 'bg-blue-500',
  moderator: 'bg-green-500',
  volunteer: 'bg-amber-500',
  attendee: 'bg-gray-500',
}

export default function AdminMembersPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const event = useEvent()
  const { isAdmin, isOwner, isLoading: roleLoading, can } = useEventRole()
  const supabase = React.useMemo(() => createClient(), [])

  const [members, setMembers] = React.useState<Member[]>([])
  const [invitations, setInvitations] = React.useState<Invitation[]>([])
  const [loading, setLoading] = React.useState(true)

  const [showInviteModal, setShowInviteModal] = React.useState(false)
  const [inviteEmails, setInviteEmails] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState('attendee')
  const [inviteType, setInviteType] = React.useState<'email' | 'link'>('link')
  const [inviting, setInviting] = React.useState(false)
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  // Redirect if not admin
  React.useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !isAdmin)) {
      router.push(`/e/${event.slug}/sessions`)
    }
  }, [user, isAdmin, authLoading, roleLoading, router, event.slug])

  // Fetch members and invitations
  React.useEffect(() => {
    async function fetchData() {
      try {
        // Fetch members
        const { data: membersData, error: membersError } = await supabase
          .from('event_members')
          .select('id,user_id,role,joined_at,user_data:user_data(display_name,email)')
          .eq('event_id', event.id)
          .order('role', { ascending: true })
          .order('joined_at', { ascending: true })

        if (!membersError && membersData) {
          setMembers(membersData as any)
        }

        // Fetch invitations
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        
        if (token) {
          const invitationsRes = await fetch(`/api/v1/events/${event.slug}/invitations`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
          if (invitationsRes.ok) {
            const data = await invitationsRes.json()
            setInvitations(data.invitations || [])
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [event.id, event.slug])

  const handleCreateInvite = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return

    setInviting(true)
    setGeneratedLink(null)

    try {
      const body: { emails?: string[]; role: string } = { role: inviteRole }

      if (inviteType === 'email' && inviteEmails.trim()) {
        body.emails = inviteEmails.split(',').map(e => e.trim()).filter(e => e)
      }

      const response = await fetch(`/api/v1/events/${event.slug}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.inviteUrl) {
          setGeneratedLink(data.inviteUrl)
        }

        // Refresh invitations list
        const invitationsRes = await fetch(`/api/v1/events/${event.slug}/invitations`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (invitationsRes.ok) {
          const invData = await invitationsRes.json()
          setInvitations(invData.invitations || [])
        }

        if (inviteType === 'email') {
          setShowInviteModal(false)
          setInviteEmails('')
        }
      }
    } catch (err) {
      console.error('Error creating invitation:', err)
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvite = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return

    if (!confirm('Revoke this invitation?')) return

    try {
      await fetch(`/api/v1/events/${event.slug}/invitations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      setInvitations(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('Error revoking invitation:', err)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) return null

  const pendingInvitations = invitations.filter(i => !i.accepted_at)

  return (
    <div className="min-h-screen bg-background">
      <AdminNav
        eventSlug={event.slug}
        canManageSchedule={can('manageSchedule')}
        canManageVenues={can('manageVenues')}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Members</h1>
              <p className="text-sm text-muted-foreground">
                {members.length} members in {event.name}
              </p>
            </div>
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite People
            </Button>
          </div>

          {/* Invite Modal */}
          {showInviteModal && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Invite People</CardTitle>
                <CardDescription>
                  Create an invitation link or send email invites
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Invite Type Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={inviteType === 'link' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInviteType('link')}
                  >
                    <LinkIcon className="h-4 w-4 mr-1" />
                    Shareable Link
                  </Button>
                  <Button
                    variant={inviteType === 'email' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInviteType('email')}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Email Invites
                  </Button>
                </div>

                {inviteType === 'email' && (
                  <div className="space-y-2">
                    <Label>Email Addresses</Label>
                    <Input
                      placeholder="email@example.com, another@example.com"
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate multiple emails with commas
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Role</Label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="attendee">Attendee</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="moderator">Moderator</option>
                    {isOwner && <option value="admin">Admin</option>}
                  </select>
                </div>

                {generatedLink && (
                  <div className="space-y-2">
                    <Label>Invitation Link</Label>
                    <div className="flex gap-2">
                      <Input value={generatedLink} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(generatedLink)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Anyone with this link can join as {inviteRole}. Expires in 7 days.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => {
                    setShowInviteModal(false)
                    setGeneratedLink(null)
                    setInviteEmails('')
                  }}>
                    {generatedLink ? 'Done' : 'Cancel'}
                  </Button>
                  {!generatedLink && (
                    <Button onClick={handleCreateInvite} disabled={inviting}>
                      {inviting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : inviteType === 'link' ? (
                        'Generate Link'
                      ) : (
                        'Send Invites'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Invitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingInvitations.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {invite.email ? (
                            <span className="font-medium">{invite.email}</span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <LinkIcon className="h-4 w-4" />
                              Shareable Link
                            </span>
                          )}
                          <Badge variant="secondary" className="capitalize">
                            {invite.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                          {' · '}
                          Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!invite.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(`${window.location.origin}/invite/e/${invite.token}`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevokeInvite(invite.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Members List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${ROLE_COLORS[member.role] || 'bg-gray-500'}`} />
                      <div>
                        <p className="font-medium">
                          {member.user_data?.display_name || member.user_data?.email || 'Unknown User'}
                        </p>
                        {member.user_data?.email && member.user_data?.display_name && (
                          <p className="text-xs text-muted-foreground">{member.user_data.email}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
