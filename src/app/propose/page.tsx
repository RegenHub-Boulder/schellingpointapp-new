'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle, MapPin, Building2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useTracks } from '@/hooks/useTracks'
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

const TIME_PREFERENCES = [
  { value: 'friday_pm', label: 'Friday PM' },
  { value: 'saturday_am', label: 'Saturday AM' },
  { value: 'saturday_pm', label: 'Saturday PM' },
  { value: 'sunday_am', label: 'Sunday AM' },
  { value: 'sunday_pm', label: 'Sunday PM' },
]

const suggestedTags = [
  'governance', 'defi', 'nfts', 'infrastructure', 'security',
  'community', 'education', 'tooling', 'research', 'design'
]

const EVENT_DAYS = [
  { value: '2026-02-13', label: 'Friday, Feb 13' },
  { value: '2026-02-14', label: 'Saturday, Feb 14' },
  { value: '2026-02-15', label: 'Sunday, Feb 15' },
]

const TIME_OPTIONS: { value: string; label: string }[] = []
for (let h = 9; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 22 && m === 30) continue
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    const label = `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${mm} ${h >= 12 ? 'PM' : 'AM'}`
    TIME_OPTIONS.push({ value: `${hh}:${mm}`, label })
  }
}

function buildTimestamp(day: string, time: string): string {
  return `${day}T${time}:00-07:00`
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

export default function ProposePage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()
  const { tracks } = useTracks()

  const [title, setTitle] = React.useState('')
  const [trackId, setTrackId] = React.useState<string | null>(null)
  const [description, setDescription] = React.useState('')
  const [format, setFormat] = React.useState('talk')
  const [duration, setDuration] = React.useState(60)
  const [tags, setTags] = React.useState<string[]>([])
  const [customTag, setCustomTag] = React.useState('')
  const [timePreferences, setTimePreferences] = React.useState<string[]>([])
  const [isSelfHosted, setIsSelfHosted] = React.useState(false)
  const [customLocation, setCustomLocation] = React.useState('')
  const [selfHostedDay, setSelfHostedDay] = React.useState('')
  const [selfHostedStartTime, setSelfHostedStartTime] = React.useState('')
  const [selfHostedEndTime, setSelfHostedEndTime] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Redirect if not logged in
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

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

    if (!user || !profile) return
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (isSelfHosted && !customLocation.trim()) {
      setError('Please provide location details for self-hosted sessions')
      return
    }
    if (isSelfHosted && selfHostedDay && (!selfHostedStartTime || !selfHostedEndTime)) {
      setError('Please provide both start and end times for your self-hosted session')
      return
    }

    const token = getAccessToken()
    if (!token) {
      setError('Session expired. Please log in again.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/sessions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          format,
          duration,
          host_id: user.id,
          host_name: profile.display_name || profile.email,
          topic_tags: tags.length > 0 ? tags : null,
          time_preferences: timePreferences.length > 0 ? timePreferences : null,
          status: 'pending',
          is_self_hosted: isSelfHosted,
          custom_location: isSelfHosted ? customLocation.trim() || null : null,
          self_hosted_start_time: isSelfHosted && selfHostedDay && selfHostedStartTime
            ? buildTimestamp(selfHostedDay, selfHostedStartTime) : null,
          self_hosted_end_time: isSelfHosted && selfHostedDay && selfHostedEndTime
            ? buildTimestamp(selfHostedDay, selfHostedEndTime) : null,
          track_id: trackId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit proposal')
      }

      setIsSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit proposal')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (isSuccess) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto py-8">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-2xl">Session Proposed!</CardTitle>
              <CardDescription>
                Your session "{title}" has been submitted for review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm text-center">
                <p>An admin will review your proposal and approve it for voting.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href="/sessions">View Sessions</Link>
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setIsSuccess(false)
                    setTitle('')
                    setDescription('')
                    setFormat('talk')
                    setDuration(60)
                    setTags([])
                    setTimePreferences([])
                    setIsSelfHosted(false)
                    setCustomLocation('')
                    setSelfHostedDay('')
                    setSelfHostedStartTime('')
                    setSelfHostedEndTime('')
                    setTrackId(null)
                  }}
                >
                  Propose Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Propose a Session</h1>
          <p className="text-muted-foreground mt-1">
            Share your knowledge with the community
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Propose a Session</CardTitle>
            <CardDescription>
              Share your knowledge with the community. Sessions will be reviewed before appearing for voting.
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
                  placeholder="What's your session about?"
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
                  placeholder="Describe what participants will learn or experience..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">{description.length}/500</p>
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

              {/* Time Preferences */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Preference</label>
                <p className="text-xs text-muted-foreground">
                  When would you prefer to present? Select all that work.
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIME_PREFERENCES.map((tp) => (
                    <button
                      key={tp.value}
                      type="button"
                      onClick={() =>
                        setTimePreferences((prev) =>
                          prev.includes(tp.value)
                            ? prev.filter((v) => v !== tp.value)
                            : [...prev, tp.value]
                        )
                      }
                      className={cn(
                        'px-4 py-2 rounded-lg border transition-colors',
                        timePreferences.includes(tp.value)
                          ? 'border-primary bg-primary/10'
                          : 'hover:border-muted-foreground/50'
                      )}
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Track */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Track</label>
                <p className="text-xs text-muted-foreground">
                  Which theme does your session fit best?
                </p>
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

              {/* Venue Type */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Venue</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSelfHosted(false)}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-colors flex items-start gap-3',
                      !isSelfHosted
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-muted-foreground/50'
                    )}
                  >
                    <Building2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Official Venue</div>
                      <div className="text-xs text-muted-foreground">
                        Use one of the event's scheduled venues
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSelfHosted(true)}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-colors flex items-start gap-3',
                      isSelfHosted
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-muted-foreground/50'
                    )}
                  >
                    <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Self-Hosted</div>
                      <div className="text-xs text-muted-foreground">
                        Host at your own location
                      </div>
                    </div>
                  </button>
                </div>

                {/* Self-hosted details - shown when self-hosted */}
                {isSelfHosted && (
                  <>
                  {/* Day Picker */}
                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium">
                      Which day? <span className="text-xs text-muted-foreground">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_DAYS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => setSelfHostedDay(selfHostedDay === day.value ? '' : day.value)}
                          className={cn(
                            'px-3 py-2 rounded-lg border text-sm transition-colors',
                            selfHostedDay === day.value
                              ? 'border-primary bg-primary/10 font-medium'
                              : 'hover:border-muted-foreground/50'
                          )}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Range */}
                  {selfHostedDay && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time Range
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={selfHostedStartTime}
                          onChange={(e) => setSelfHostedStartTime(e.target.value)}
                          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Start time</option>
                          {TIME_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <span className="text-muted-foreground">to</span>
                        <select
                          value={selfHostedEndTime}
                          onChange={(e) => setSelfHostedEndTime(e.target.value)}
                          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                        >
                          <option value="">End time</option>
                          {TIME_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location Details <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="Where will your session be held? Include address, room info, or any directions attendees need..."
                      rows={3}
                      maxLength={300}
                    />
                    <p className="text-xs text-muted-foreground">
                      {customLocation.length}/300 - Provide enough detail for attendees to find you
                    </p>
                  </div>
                  </>
                )}
              </div>

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
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {suggestedTags
                    .filter((t) => !tags.includes(t))
                    .slice(0, 6)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="px-2 py-1 text-xs rounded border hover:bg-accent"
                        disabled={tags.length >= 5}
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" loading={isSubmitting}>
                Submit Proposal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
