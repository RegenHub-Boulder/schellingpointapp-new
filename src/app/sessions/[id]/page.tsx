'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  Users,
  Heart,
  Share2,
  Calendar,
  Mic,
  Wrench,
  MessageSquare,
  Monitor,
  User,
  Loader2,
  Vote,
  Clock,
  Plus,
  Minus,
  ExternalLink,
  Pencil,
  Hexagon,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/DashboardLayout'
import { EditSessionModal } from '@/components/EditSessionModal'
import { useAuth } from '@/hooks/useAuth'
import { votesToCredits } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TOTAL_CREDITS = 100

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  talk: Mic,
  workshop: Wrench,
  discussion: MessageSquare,
  panel: Users,
  demo: Monitor,
}

const formatDescriptions: Record<string, string> = {
  talk: 'A presentation by one speaker',
  workshop: 'Hands-on interactive session',
  discussion: 'Facilitated group conversation',
  panel: 'Multiple speakers discuss a topic',
  demo: 'Live demonstration of a project or tool',
}

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

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const { user, profile } = useAuth()

  const [session, setSession] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [userVotes, setUserVotes] = React.useState(0)
  const [isFavorited, setIsFavorited] = React.useState(false)
  const [allUserVotes, setAllUserVotes] = React.useState<Record<string, number>>({})
  const [showShareToast, setShowShareToast] = React.useState(false)
  const [showCalendarMenu, setShowCalendarMenu] = React.useState(false)
  const [showHostCard, setShowHostCard] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const calendarMenuRef = React.useRef<HTMLDivElement>(null)
  const hostCardRef = React.useRef<HTMLDivElement>(null)

  // Close calendar menu and host card when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarMenuRef.current && !calendarMenuRef.current.contains(event.target as Node)) {
        setShowCalendarMenu(false)
      }
      if (hostCardRef.current && !hostCardRef.current.contains(event.target as Node)) {
        setShowHostCard(false)
      }
    }

    if (showCalendarMenu || showHostCard) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendarMenu, showHostCard])

  // Calculate credits spent
  const creditsSpent = React.useMemo(() => {
    return Object.values(allUserVotes).reduce((sum, votes) => sum + votesToCredits(votes), 0)
  }, [allUserVotes])

  const creditsRemaining = TOTAL_CREDITS - creditsSpent

  // Fetch session data
  React.useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}&select=*,venue:venues(*),time_slot:time_slots(*),host:profiles!host_id(id,display_name,bio,avatar_url,affiliation,building,telegram,ens,interests)`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          if (data.length > 0) {
            setSession(data[0])
          } else {
            setError('Session not found')
          }
        } else {
          setError('Failed to load session')
        }
      } catch (err) {
        console.error('Error fetching session:', err)
        setError('Failed to load session')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [sessionId])

  // Fetch user's votes and favorites
  React.useEffect(() => {
    if (!user) return

    const fetchUserData = async () => {
      const token = getAccessToken()
      if (!token) return

      try {
        // Fetch all user votes
        const votesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?user_id=eq.${user.id}&select=session_id,vote_count`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (votesResponse.ok) {
          const votesData = await votesResponse.json()
          const votesMap: Record<string, number> = {}
          votesData.forEach((v: any) => {
            votesMap[v.session_id] = v.vote_count
          })
          setAllUserVotes(votesMap)
          setUserVotes(votesMap[sessionId] || 0)
        }

        // Fetch favorites
        const favResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${user.id}&session_id=eq.${sessionId}&select=id`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (favResponse.ok) {
          const favData = await favResponse.json()
          setIsFavorited(favData.length > 0)
        }
      } catch (err) {
        console.error('Error fetching user data:', err)
      }
    }

    fetchUserData()
  }, [user, sessionId])

  // Handle vote change
  const handleVote = async (delta: number) => {
    if (!user) {
      router.push('/login')
      return
    }

    const token = getAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    const newVoteCount = Math.max(0, userVotes + delta)
    const oldCredits = votesToCredits(userVotes)
    const newCredits = votesToCredits(newVoteCount)
    const creditDiff = newCredits - oldCredits

    // Check if user has enough credits
    if (creditsSpent + creditDiff > TOTAL_CREDITS) {
      return
    }

    // Optimistic update
    setUserVotes(newVoteCount)
    setAllUserVotes(prev => ({ ...prev, [sessionId]: newVoteCount }))

    try {
      if (newVoteCount === 0) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/votes?user_id=eq.${user.id}&session_id=eq.${sessionId}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )
      } else {
        await fetch(
          `${SUPABASE_URL}/rest/v1/votes?on_conflict=user_id,session_id`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              user_id: user.id,
              session_id: sessionId,
              vote_count: newVoteCount,
              credits_spent: newCredits,
            }),
          }
        )
      }

      // Refresh session to get updated vote counts
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}&select=*,venue:venues(*),time_slot:time_slots(*),host:profiles!host_id(id,display_name,bio,avatar_url,affiliation,building,telegram,ens,interests)`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setSession(data[0])
        }
      }
    } catch (err) {
      console.error('Error voting:', err)
      setUserVotes(userVotes)
      setAllUserVotes(prev => ({ ...prev, [sessionId]: userVotes }))
    }
  }

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    const token = getAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    // Optimistic update
    setIsFavorited(!isFavorited)

    try {
      if (isFavorited) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${user.id}&session_id=eq.${sessionId}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )
      } else {
        await fetch(
          `${SUPABASE_URL}/rest/v1/favorites`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              session_id: sessionId,
            }),
          }
        )
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
      setIsFavorited(!isFavorited)
    }
  }

  // Handle share
  const handleShare = async () => {
    const shareUrl = window.location.href
    const shareTitle = session?.title || 'Check out this session'
    const shareText = session?.description
      ? `${shareTitle} - ${session.description.substring(0, 100)}...`
      : shareTitle

    // Try Web Share API first (mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        return
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
        if ((err as Error).name === 'AbortError') return
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Handle delete session
  const handleDelete = async () => {
    if (!user) return

    const token = getAccessToken()
    if (!token) return

    setIsDeleting(true)

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok || response.status === 204) {
        router.push('/sessions')
      } else {
        console.error('Error deleting session:', await response.text())
        setShowDeleteConfirm(false)
      }
    } catch (err) {
      console.error('Error deleting session:', err)
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // Generate calendar event data
  const getCalendarEventData = () => {
    if (!session?.time_slot) return null

    const startDate = new Date(session.time_slot.start_time)
    const endDate = new Date(session.time_slot.end_time)
    const title = session.title
    const description = [
      session.description || '',
      '',
      `Format: ${session.format}`,
      session.host_name ? `Host: ${session.host_name}` : '',
      '',
      `View session: ${window.location.href}`,
    ].filter(Boolean).join('\n')
    const location = session.venue?.name || session.custom_location || 'EthBoulder'

    return { startDate, endDate, title, description, location }
  }

  // Add to Google Calendar
  const handleAddToGoogleCalendar = () => {
    const event = getCalendarEventData()
    if (!event) return

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, '')
    }

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatDate(event.startDate)}/${formatDate(event.endDate)}`,
      details: event.description,
      location: event.location,
    })

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank')
    setShowCalendarMenu(false)
  }

  // Download ICS file (works with Apple Calendar, Outlook, etc.)
  const handleDownloadICS = () => {
    const event = getCalendarEventData()
    if (!event) return

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, -1) + 'Z'
    }

    const escapeICS = (str: string) => {
      return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SchellingPoint//Session//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(event.startDate)}`,
      `DTEND:${formatICSDate(event.endDate)}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${escapeICS(event.description)}`,
      `LOCATION:${escapeICS(event.location)}`,
      `UID:${session.id}@schellingpoint.app`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${session.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowCalendarMenu(false)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !session) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error || 'Session not found'}</p>
            <Button onClick={() => router.push('/sessions')}>View All Sessions</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const FormatIcon = formatIcons[session.format] || Mic
  const nextVoteCost = 2 * userVotes + 1
  const canAddVote = creditsRemaining >= nextVoteCost

  return (
    <DashboardLayout>
      <div className="space-y-6 overflow-hidden">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </Button>

        <div className="grid gap-6 lg:grid-cols-3 overflow-hidden">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* Header Card - no overflow-hidden here as host popover needs to overflow */}
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
                    <FormatIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="capitalize">{session.format}</span>
                    <span className="text-muted-foreground/50 hidden sm:inline">•</span>
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>{session.duration} min</span>
                    <span className="text-muted-foreground/50 hidden sm:inline">•</span>
                    <Badge variant={session.status === 'scheduled' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold mb-4 break-words">{session.title}</h1>

                  {(session.host_name || session.host) && (
                    <div className="relative" ref={hostCardRef}>
                      <button
                        onClick={() => setShowHostCard(!showHostCard)}
                        className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity group"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {session.host?.avatar_url ? (
                            <img
                              src={session.host.avatar_url}
                              alt={session.host.display_name || session.host_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-muted-foreground">Hosted by</span>
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {session.host?.display_name || session.host_name}
                        </span>
                      </button>

                      {/* Host Profile Card - Desktop: floating card, Mobile: bottom sheet style */}
                      {showHostCard && (
                        <>
                          {/* Mobile overlay */}
                          <div
                            className="fixed inset-0 bg-black/50 z-40 md:hidden"
                            onClick={() => setShowHostCard(false)}
                          />
                          {/* Card */}
                          <div className="fixed md:absolute inset-x-4 bottom-4 md:inset-x-auto md:bottom-auto md:left-0 md:top-full md:mt-2 md:w-80 bg-card border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 md:slide-in-from-bottom-0">
                            <div className="p-4">
                              {/* Header with avatar */}
                              <div className="flex items-start gap-3 mb-3">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                  {session.host?.avatar_url ? (
                                    <img
                                      src={session.host.avatar_url}
                                      alt={session.host.display_name || session.host_name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <User className="h-6 w-6 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold truncate">
                                    {session.host?.display_name || session.host_name}
                                  </h4>
                                  {session.host?.affiliation && (
                                    <p className="text-sm text-muted-foreground truncate">
                                      {session.host.affiliation}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Bio */}
                              {session.host?.bio && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                                  {session.host.bio}
                                </p>
                              )}

                              {/* Building/What they're working on */}
                              {session.host?.building && (
                                <div className="text-sm mb-3">
                                  <span className="text-muted-foreground">Building: </span>
                                  <span>{session.host.building}</span>
                                </div>
                              )}

                              {/* Interests */}
                              {session.host?.interests && session.host.interests.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {session.host.interests.slice(0, 4).map((interest: string) => (
                                    <Badge key={interest} variant="secondary" className="text-xs">
                                      {interest}
                                    </Badge>
                                  ))}
                                  {session.host.interests.length > 4 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{session.host.interests.length - 4}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Telegram link */}
                              {session.host?.telegram && (
                                <a
                                  href={`https://t.me/${session.host.telegram.replace('@', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  @{session.host.telegram.replace('@', '')}
                                </a>
                              )}

                              {/* ENS link */}
                              {session.host?.ens && (
                                <a
                                  href={`https://app.ens.domains/${session.host.ens}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                                >
                                  <Hexagon className="h-3.5 w-3.5" />
                                  {session.host.ens}
                                </a>
                              )}

                              {/* View profile link */}
                              {session.host?.id && (
                                <Link
                                  href={`/participants?highlight=${session.host.id}`}
                                  className="block mt-3 pt-3 border-t text-sm text-center text-primary hover:underline"
                                  onClick={() => setShowHostCard(false)}
                                >
                                  View full profile
                                </Link>
                              )}

                              {/* If no host profile, show minimal info */}
                              {!session.host && session.host_name && (
                                <p className="text-sm text-muted-foreground italic">
                                  Profile details not available
                                </p>
                              )}
                            </div>

                            {/* Mobile close button */}
                            <button
                              onClick={() => setShowHostCard(false)}
                              className="md:hidden w-full py-3 border-t text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                              Close
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Edit button - show for session host or admin */}
                  {user && (session.host_id === user.id || profile?.is_admin) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEditModal(true)}
                      title="Edit session"
                    >
                      <Pencil className="h-5 w-5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleFavorite}
                    className={isFavorited ? 'text-red-500' : ''}
                  >
                    <Heart className={isFavorited ? 'fill-current' : ''} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleShare}>
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Tags */}
              {session.topic_tags && session.topic_tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {session.topic_tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* Venue & Schedule */}
            {(session.venue || session.time_slot || session.is_self_hosted) && (
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="grid sm:grid-cols-2 gap-6">
                  {session.is_self_hosted ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Self-Hosted Location</h3>
                      </div>
                      <Badge variant="secondary" className="mb-2">Self-Hosted</Badge>
                      {session.custom_location ? (
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {session.custom_location}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Location details will be provided by the host
                        </p>
                      )}
                    </div>
                  ) : session.venue && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Location</h3>
                      </div>
                      <p className="text-lg font-medium">{session.venue.name}</p>
                      {session.venue.capacity && (
                        <p className="text-sm text-muted-foreground">
                          Capacity: {session.venue.capacity} people
                        </p>
                      )}
                      {session.venue.features && session.venue.features.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {session.venue.features.map((feature: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {session.time_slot && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Schedule</h3>
                      </div>
                      <p className="text-lg font-medium">
                        {new Date(session.time_slot.start_time).toLocaleDateString([], {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(session.time_slot.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' - '}
                        {new Date(session.time_slot.end_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {session.time_slot.label && (
                        <Badge variant="outline" className="mt-2">
                          {session.time_slot.label}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Description */}
            <Card className="p-6 overflow-hidden">
              <h2 className="text-xl font-semibold mb-4">About This Session</h2>
              <div className="prose prose-sm max-w-none break-words">
                {session.description ? (
                  session.description.split('\n').map((paragraph: string, i: number) => (
                    <p key={i} className="text-muted-foreground mb-3">
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No description provided.</p>
                )}
              </div>
            </Card>

            {/* Format Info */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Session Format</h2>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FormatIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium capitalize">{session.format}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDescriptions[session.format] || 'Interactive session'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Voting Card */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Cast Your Votes</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total votes</span>
                  <div className="flex items-center gap-1">
                    <Vote className="h-4 w-4" />
                    <span className="font-medium">{session.total_votes || 0}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total voters</span>
                  <span className="font-medium">{session.voter_count || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Credits allocated</span>
                  <span className="font-medium">{session.total_credits || 0}</span>
                </div>

                {user && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Your votes</span>
                      <span className="font-semibold">{userVotes}</span>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleVote(-1)}
                        disabled={userVotes === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="min-w-[60px] text-center">
                        <div className="text-2xl font-bold">{userVotes}</div>
                        <div className="text-xs text-muted-foreground">
                          {votesToCredits(userVotes)} credits
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleVote(1)}
                        disabled={!canAddVote}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {!canAddVote && userVotes > 0 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Next vote costs {nextVoteCost} credits
                      </p>
                    )}
                  </div>
                )}

                {!user && (
                  <div className="pt-4 border-t text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Sign in to vote on this session
                    </p>
                    <Button asChild className="w-full">
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {/* Edit button for session host or admin */}
                {user && (session.host_id === user.id || profile?.is_admin) && (
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Session
                  </Button>
                )}
                <Button
                  className="w-full justify-start"
                  variant={isFavorited ? "default" : "outline"}
                  onClick={handleToggleFavorite}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
                  {isFavorited ? 'Saved to My Schedule' : 'Add to My Schedule'}
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Session
                </Button>
                {session.time_slot && (
                  <div className="relative" ref={calendarMenuRef}>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Add to Calendar
                    </Button>
                    {showCalendarMenu && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 py-1">
                        <button
                          className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                          onClick={handleAddToGoogleCalendar}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Google Calendar
                        </button>
                        <button
                          className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                          onClick={handleDownloadICS}
                        >
                          <Calendar className="h-4 w-4" />
                          Download .ics (Apple, Outlook)
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Delete button for session host or admin */}
                {user && (session.host_id === user.id || profile?.is_admin) && (
                  <Button
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Session
                  </Button>
                )}
              </div>
            </Card>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <div
                  className="w-full max-w-md bg-card border rounded-xl shadow-xl p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-full bg-destructive/10">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Delete Session</h3>
                      <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Are you sure you want to delete "<span className="font-medium text-foreground">{session.title}</span>"?
                    All votes and favorites for this session will also be removed.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Share Toast */}
            {showShareToast && (
              <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2">
                Link copied to clipboard!
              </div>
            )}

            {/* Edit Session Modal */}
            {session && (
              <EditSessionModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                session={{
                  id: session.id,
                  title: session.title,
                  description: session.description,
                  format: session.format,
                  topic_tags: session.topic_tags,
                }}
                onSave={async () => {
                  // Refresh session data
                  const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}&select=*,venue:venues(*),time_slot:time_slots(*),host:profiles!host_id(id,display_name,bio,avatar_url,affiliation,building,telegram,ens,interests)`,
                    {
                      headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                      },
                    }
                  )
                  if (response.ok) {
                    const data = await response.json()
                    if (data.length > 0) {
                      setSession(data[0])
                    }
                  }
                }}
              />
            )}

            {/* Stats Card */}
            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold mb-4">Session Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Votes</span>
                  <span className="font-bold text-lg">{session.total_votes || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Unique Voters</span>
                  <span className="font-bold text-lg">{session.voter_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Credits Committed</span>
                  <span className="font-bold text-lg">{session.total_credits || 0}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
