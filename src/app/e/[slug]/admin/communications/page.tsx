'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, CheckCircle, History, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AdminNav } from '@/components/admin/AdminNav'
import { useAuth } from '@/hooks/useAuth'
import { useEvent, useEventRole } from '@/contexts/EventContext'
import { formatDistanceToNow } from 'date-fns'

interface Broadcast {
  title: string
  body: string | null
  action_url: string | null
  data: Record<string, unknown> | null
  created_at: string
}

export default function AdminCommunicationsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const event = useEvent()
  const { isAdmin, isLoading: roleLoading, can } = useEventRole()

  const [title, setTitle] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [ctaUrl, setCtaUrl] = React.useState('')
  const [ctaText, setCtaText] = React.useState('')

  const [isLoading, setIsLoading] = React.useState(false)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const [broadcasts, setBroadcasts] = React.useState<Broadcast[]>([])
  const [loadingHistory, setLoadingHistory] = React.useState(true)

  // Fetch broadcast history
  React.useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/v1/events/${event.slug}/admin/broadcast`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setBroadcasts(data.broadcasts || [])
        }
      } catch (err) {
        console.error('Error fetching broadcast history:', err)
      } finally {
        setLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [event.slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccess(null)
    setError(null)

    try {
      const response = await fetch(`/api/v1/events/${event.slug}/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          ctaUrl: ctaUrl.trim() || undefined,
          ctaText: ctaText.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send announcement')
        return
      }

      setSuccess(data.message || `Announcement sent to ${data.sent} members`)
      setTitle('')
      setMessage('')
      setCtaUrl('')
      setCtaText('')

      // Refresh history
      const historyResponse = await fetch(`/api/v1/events/${event.slug}/admin/broadcast`, {
        credentials: 'include',
      })
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setBroadcasts(historyData.broadcasts || [])
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Redirect if not admin
  React.useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !isAdmin)) {
      router.push(`/e/${event.slug}/sessions`)
    }
  }, [user, isAdmin, authLoading, roleLoading, router, event.slug])

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

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
          <div>
            <h1 className="text-2xl font-bold">Communications</h1>
            <p className="text-sm text-muted-foreground">
              Send announcements to all {event.name} attendees
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
          {/* Send Announcement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Send Announcement
              </CardTitle>
              <CardDescription>
                Compose a message to send to all event members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {success && (
                  <Alert className="bg-green-500/10 border-green-500/30">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-500">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Important Update"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Write your announcement here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {message.length}/1000
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ctaUrl">Link URL (optional)</Label>
                    <Input
                      id="ctaUrl"
                      type="url"
                      placeholder="https://..."
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ctaText">Link Text (optional)</Label>
                    <Input
                      id="ctaText"
                      placeholder="Learn More"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      maxLength={30}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Announcement
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Broadcast History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Announcements
              </CardTitle>
              <CardDescription>
                Previously sent announcements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No announcements sent yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {broadcasts.map((broadcast, index) => (
                    <div
                      key={index}
                      className="border-b border-border pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm">{broadcast.title}</h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {broadcast.body && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {broadcast.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </main>
    </div>
  )
}
