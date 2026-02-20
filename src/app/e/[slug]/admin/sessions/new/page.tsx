'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2, CheckCircle, UserPlus, Search, X, FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AdminNav } from '@/components/admin/AdminNav'
import { useAuth } from '@/hooks/useAuth'
import { useEvent, useEventRole } from '@/contexts/EventContext'
import { CSVSessionImport } from '@/components/admin/CSVSessionImport'
import { cn } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const formats = [
  { value: 'talk', label: 'Talk', description: 'A presentation or lecture' },
  { value: 'workshop', label: 'Workshop', description: 'Hands-on interactive session' },
  { value: 'discussion', label: 'Discussion', description: 'Open group conversation' },
  { value: 'panel', label: 'Panel', description: 'Multiple speakers discussing' },
  { value: 'demo', label: 'Demo', description: 'Live demonstration' },
]

const durations = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
]

const statuses = [
  { value: 'approved', label: 'Approved', description: 'Ready for voting/scheduling' },
  { value: 'scheduled', label: 'Scheduled', description: 'Already assigned to a slot' },
  { value: 'pending', label: 'Pending', description: 'Awaiting review' },
]

interface Track {
  id: string
  name: string
  color: string | null
}

interface Venue {
  id: string
  name: string
}

interface TimeSlot {
  id: string
  start_time: string
  end_time: string
  label: string | null
  day_date: string | null
  venue_id: string | null
  is_break: boolean
}

interface UserProfile {
  id: string
  display_name: string | null
  email: string
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

export default function AdminCreateSessionPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { user, isLoading: authLoading } = useAuth()
  const event = useEvent()
  const { isAdmin } = useEventRole()

  // Form state
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [format, setFormat] = React.useState('talk')
  const [duration, setDuration] = React.useState(60)
  const [status, setStatus] = React.useState('approved')
  const [trackId, setTrackId] = React.useState<string | null>(null)
  const [tags, setTags] = React.useState<string[]>([])
  const [customTag, setCustomTag] = React.useState('')

  // Host selection
  const [hostType, setHostType] = React.useState<'existing' | 'external'>('external')
  const [hostSearch, setHostSearch] = React.useState('')
  const [hostSearchResults, setHostSearchResults] = React.useState<UserProfile[]>([])
  const [selectedHost, setSelectedHost] = React.useState<UserProfile | null>(null)
  const [externalHostName, setExternalHostName] = React.useState('')
  const [isSearching, setIsSearching] = React.useState(false)

  // Scheduling (for status = 'scheduled')
  const [venueId, setVenueId] = React.useState<string | null>(null)
  const [timeSlotId, setTimeSlotId] = React.useState<string | null>(null)

  // Data
  const [tracks, setTracks] = React.useState<Track[]>([])
  const [venues, setVenues] = React.useState<Venue[]>([])
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([])

  // UI state
  const [mode, setMode] = React.useState<'single' | 'bulk'>('single')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [createdSessionId, setCreatedSessionId] = React.useState<string | null>(null)
  const [bulkImportCount, setBulkImportCount] = React.useState(0)

  // Fetch tracks, venues, time slots
  React.useEffect(() => {
    const fetchData = async () => {
      const token = getAccessToken()
      const headers: Record<string, string> = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token || SUPABASE_KEY}`,
      }

      const [tracksRes, venuesRes, slotsRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/tracks?event_id=eq.${event.id}&is_active=eq.true&select=id,name,color&order=name`,
          { headers }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/venues?event_id=eq.${event.id}&select=id,name&order=name`,
          { headers }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/time_slots?event_id=eq.${event.id}&is_break=eq.false&select=id,start_time,end_time,label,day_date,venue_id&order=start_time`,
          { headers }
        ),
      ])

      if (tracksRes.ok) setTracks(await tracksRes.json())
      if (venuesRes.ok) setVenues(await venuesRes.json())
      if (slotsRes.ok) setTimeSlots(await slotsRes.json())
    }

    if (event.id) fetchData()
  }, [event.id])

  // Search users for host selection
  React.useEffect(() => {
    const searchUsers = async () => {
      if (hostType !== 'existing' || hostSearch.length < 2) {
        setHostSearchResults([])
        return
      }

      setIsSearching(true)
      const token = getAccessToken()

      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?or=(display_name.ilike.*${hostSearch}*,email.ilike.*${hostSearch}*)&select=id,display_name,email&limit=10`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token || SUPABASE_KEY}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setHostSearchResults(data)
        }
      } catch (err) {
        console.error('Error searching users:', err)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounce)
  }, [hostSearch, hostType])

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim()
    if (normalizedTag && !tags.includes(normalizedTag) && tags.length < 5) {
      setTags([...tags, normalizedTag])
    }
    setCustomTag('')
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (hostType === 'external' && !externalHostName.trim()) {
      setError('Host name is required for external speakers')
      return
    }

    if (status === 'scheduled' && (!venueId || !timeSlotId)) {
      setError('Please select a venue and time slot for scheduled sessions')
      return
    }

    const token = getAccessToken()
    if (!token) {
      setError('Session expired. Please log in again.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/v1/events/${slug}/admin/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          format,
          duration,
          status,
          track_id: trackId,
          topic_tags: tags.length > 0 ? tags : null,
          host_id: hostType === 'existing' && selectedHost ? selectedHost.id : null,
          host_name: hostType === 'external' ? externalHostName.trim() : (selectedHost?.display_name || selectedHost?.email),
          venue_id: status === 'scheduled' ? venueId : null,
          time_slot_id: status === 'scheduled' ? timeSlotId : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      const data = await response.json()
      setCreatedSessionId(data.id)
      setIsSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create session'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter time slots by selected venue
  const filteredTimeSlots = React.useMemo(() => {
    if (!venueId) return []
    return timeSlots.filter(slot => slot.venue_id === venueId)
  }, [timeSlots, venueId])

  // Format time slot for display
  const formatTimeSlot = (slot: TimeSlot) => {
    const start = new Date(slot.start_time)
    const end = new Date(slot.end_time)
    const dayLabel = slot.day_date
      ? new Date(slot.day_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : ''
    const timeLabel = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    return `${dayLabel} ${timeLabel}${slot.label ? ` (${slot.label})` : ''}`
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav eventSlug={slug} canManageSchedule={true} canManageVenues={true} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav eventSlug={slug} canManageSchedule={true} canManageVenues={true} />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">You don't have permission to create sessions.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav eventSlug={slug} canManageSchedule={true} canManageVenues={true} />
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-2xl">Session Created!</CardTitle>
              <CardDescription>
                "{title}" has been created with status: {status}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={`/e/${slug}/sessions/${createdSessionId}`}>View Session</a>
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setIsSuccess(false)
                    setTitle('')
                    setDescription('')
                    setFormat('talk')
                    setDuration(60)
                    setStatus('approved')
                    setTrackId(null)
                    setTags([])
                    setHostType('external')
                    setSelectedHost(null)
                    setExternalHostName('')
                    setVenueId(null)
                    setTimeSlotId(null)
                    setCreatedSessionId(null)
                  }}
                >
                  Create Another
                </Button>
              </div>
              <Button variant="ghost" className="w-full" asChild>
                <a href={`/e/${slug}/admin`}>Back to Admin</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav eventSlug={slug} canManageSchedule={true} canManageVenues={true} />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create Session</h1>
          <p className="text-muted-foreground mt-1">
            Add a curated session for {event.name}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
              mode === 'single'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted hover:border-muted-foreground/50'
            )}
          >
            <FileText className="h-4 w-4" />
            Single Session
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
              mode === 'bulk'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted hover:border-muted-foreground/50'
            )}
          >
            <Upload className="h-4 w-4" />
            Bulk Import (CSV)
          </button>
        </div>

        {/* Bulk Import Success Message */}
        {bulkImportCount > 0 && mode === 'bulk' && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">
                Successfully imported {bulkImportCount} session{bulkImportCount > 1 ? 's' : ''}
              </p>
              <a href={`/e/${slug}/admin`} className="text-sm text-green-600 dark:text-green-400 hover:underline">
                View all sessions
              </a>
            </div>
          </div>
        )}

        {mode === 'bulk' ? (
          <CSVSessionImport
            eventSlug={slug}
            tracks={tracks}
            onImportComplete={(count) => setBulkImportCount(count)}
          />
        ) : (
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>
              Create a session directly with full control over status and scheduling.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Session title"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">{title.length}/100</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the session..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">{description.length}/500</p>
              </div>

              {/* Host Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Host <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setHostType('external')
                      setSelectedHost(null)
                    }}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-colors',
                      hostType === 'external'
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-muted-foreground/50'
                    )}
                  >
                    <div className="font-medium text-sm">External Speaker</div>
                    <div className="text-xs text-muted-foreground">Enter name manually</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHostType('existing')}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-colors',
                      hostType === 'existing'
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-muted-foreground/50'
                    )}
                  >
                    <div className="font-medium text-sm">Existing User</div>
                    <div className="text-xs text-muted-foreground">Search registered users</div>
                  </button>
                </div>

                {hostType === 'external' ? (
                  <Input
                    value={externalHostName}
                    onChange={(e) => setExternalHostName(e.target.value)}
                    placeholder="Speaker name"
                  />
                ) : (
                  <div className="space-y-2">
                    {selectedHost ? (
                      <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">
                          {selectedHost.display_name || selectedHost.email}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedHost(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={hostSearch}
                            onChange={(e) => setHostSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            className="pl-9"
                          />
                          {isSearching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                          )}
                        </div>
                        {hostSearchResults.length > 0 && (
                          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                            {hostSearchResults.map((profile) => (
                              <button
                                key={profile.id}
                                type="button"
                                onClick={() => {
                                  setSelectedHost(profile)
                                  setHostSearch('')
                                  setHostSearchResults([])
                                }}
                                className="w-full p-2 text-left hover:bg-muted/50 text-sm"
                              >
                                <div className="font-medium">{profile.display_name || 'No name'}</div>
                                <div className="text-xs text-muted-foreground">{profile.email}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Format */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {formats.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFormat(f.value)}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        format === f.value
                          ? 'border-primary bg-primary/10'
                          : 'hover:border-muted-foreground/50'
                      )}
                    >
                      <div className="font-medium text-sm">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <div className="flex gap-2">
                  {durations.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDuration(d.value)}
                      className={cn(
                        'px-4 py-2 rounded-lg border transition-colors',
                        duration === d.value
                          ? 'border-primary bg-primary/10'
                          : 'hover:border-muted-foreground/50'
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {statuses.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        setStatus(s.value)
                        if (s.value !== 'scheduled') {
                          setVenueId(null)
                          setTimeSlotId(null)
                        }
                      }}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        status === s.value
                          ? 'border-primary bg-primary/10'
                          : 'hover:border-muted-foreground/50'
                      )}
                    >
                      <div className="font-medium text-sm">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduling (when status is 'scheduled') */}
              {status === 'scheduled' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm">Schedule Assignment</h4>

                  {/* Venue */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Venue</label>
                    <select
                      value={venueId || ''}
                      onChange={(e) => {
                        setVenueId(e.target.value || null)
                        setTimeSlotId(null)
                      }}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select venue...</option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Time Slot */}
                  {venueId && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Time Slot</label>
                      <select
                        value={timeSlotId || ''}
                        onChange={(e) => setTimeSlotId(e.target.value || null)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select time slot...</option>
                        {filteredTimeSlots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {formatTimeSlot(slot)}
                          </option>
                        ))}
                      </select>
                      {filteredTimeSlots.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No time slots available for this venue
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Track */}
              {tracks.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Track</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTrackId(null)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm transition-colors text-left',
                        trackId === null
                          ? 'border-primary bg-primary/10'
                          : 'hover:border-muted-foreground/50'
                      )}
                    >
                      None
                    </button>
                    {tracks.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => setTrackId(track.id)}
                        className={cn(
                          'px-3 py-2 rounded-lg border text-sm transition-colors text-left flex items-center gap-2',
                          trackId === track.id
                            ? 'border-primary bg-primary/10'
                            : 'hover:border-muted-foreground/50'
                        )}
                      >
                        {track.color && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: track.color }}
                          />
                        )}
                        <span className="truncate">{track.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags (up to 5)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag(customTag)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddTag(customTag)}
                    disabled={!customTag.trim() || tags.length >= 5}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" asChild>
                  <a href={`/e/${slug}/admin`}>Cancel</a>
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Session
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  )
}
