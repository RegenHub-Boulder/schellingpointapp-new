'use client'

import * as React from 'react'
import { X, Loader2, Search, MapPin, Clock, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTracks } from '@/hooks/useTracks'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const formats = [
  { value: 'talk', label: 'Talk', description: 'A presentation or lecture' },
  { value: 'workshop', label: 'Workshop', description: 'Hands-on interactive session' },
  { value: 'discussion', label: 'Discussion', description: 'Open group conversation' },
  { value: 'panel', label: 'Panel', description: 'Multiple speakers discussing' },
  { value: 'demo', label: 'Demo', description: 'Live demonstration' },
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

function parseTimestamp(iso: string | null | undefined): { day: string; time: string } {
  if (!iso) return { day: '', time: '' }
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const dayNum = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { day: `${year}-${month}-${dayNum}`, time: `${hh}:${mm}` }
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

// --- Profile types and search component ---

interface ProfileResult {
  id: string
  display_name: string | null
  avatar_url: string | null
}

function ProfileSearch({
  onSelect,
  excludeIds,
  placeholder = 'Search profiles...',
}: {
  onSelect: (profile: ProfileResult) => void
  excludeIds: string[]
  placeholder?: string
}) {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<ProfileResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [showDropdown, setShowDropdown] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>()

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const token = getAccessToken()
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?display_name=ilike.*${encodeURIComponent(query.trim())}*&select=id,display_name,avatar_url&limit=8`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token || SUPABASE_KEY}`,
            },
          }
        )
        if (res.ok) {
          const data: ProfileResult[] = await res.json()
          setResults(data.filter((p) => !excludeIds.includes(p.id)))
          setShowDropdown(true)
        }
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, excludeIds])

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
          onFocus={() => { if (results.length > 0) setShowDropdown(true) }}
        />
        {isSearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left text-sm"
              onClick={() => {
                onSelect(profile)
                setQuery('')
                setResults([])
                setShowDropdown(false)
              }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {(profile.display_name || '?')[0].toUpperCase()}
                </div>
              )}
              <span className="truncate">{profile.display_name || 'Unnamed'}</span>
            </button>
          ))}
        </div>
      )}
      {showDropdown && results.length === 0 && query.trim().length >= 2 && !isSearching && (
        <div className="absolute z-10 mt-1 w-full bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm text-muted-foreground">
          No profiles found
        </div>
      )}
    </div>
  )
}

// --- Cohost type matching the shape from SessionDetailClient ---

interface CohostEntry {
  user_id: string
  profile: ProfileResult | null
}

// --- Main modal ---

interface EditSessionModalProps {
  isOpen: boolean
  onClose: () => void
  session: {
    id: string
    title: string
    description: string | null
    format: string
    topic_tags: string[] | null
    track_id?: string | null
    is_self_hosted?: boolean
    custom_location?: string | null
    self_hosted_start_time?: string | null
    self_hosted_end_time?: string | null
    telegram_group_url?: string | null
  }
  onSave: () => void
  isAdmin?: boolean
  hostId?: string | null
  hostName?: string | null
  host?: ProfileResult | null
  cohosts?: CohostEntry[]
}

export function EditSessionModal({
  isOpen, onClose, session, onSave,
  isAdmin, hostId, hostName, host, cohosts,
}: EditSessionModalProps) {
  const { tracks } = useTracks()
  const [title, setTitle] = React.useState(session.title)
  const [description, setDescription] = React.useState(session.description || '')
  const [format, setFormat] = React.useState(session.format)
  const [tags, setTags] = React.useState<string[]>(session.topic_tags || [])
  const [trackId, setTrackId] = React.useState<string | null>(session.track_id || null)
  const [customTag, setCustomTag] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [telegramGroupUrl, setTelegramGroupUrl] = React.useState(session?.telegram_group_url || '')

  // Self-hosted state
  const [isSelfHosted, setIsSelfHosted] = React.useState(session.is_self_hosted || false)
  const [customLocation, setCustomLocation] = React.useState(session.custom_location || '')
  const [selfHostedDay, setSelfHostedDay] = React.useState(() => parseTimestamp(session.self_hosted_start_time).day)
  const [selfHostedStartTime, setSelfHostedStartTime] = React.useState(() => parseTimestamp(session.self_hosted_start_time).time)
  const [selfHostedEndTime, setSelfHostedEndTime] = React.useState(() => parseTimestamp(session.self_hosted_end_time).time)

  // Admin host editing state
  const [selectedHost, setSelectedHost] = React.useState<ProfileResult | null>(host || null)
  const [hostNameText, setHostNameText] = React.useState(hostName || '')
  const [editCohosts, setEditCohosts] = React.useState<CohostEntry[]>(cohosts || [])

  // Reset form when session changes
  React.useEffect(() => {
    setTitle(session.title)
    setDescription(session.description || '')
    setFormat(session.format)
    setTags(session.topic_tags || [])
    setTrackId(session.track_id || null)
    setTelegramGroupUrl(session?.telegram_group_url || '')
    setIsSelfHosted(session.is_self_hosted || false)
    setCustomLocation(session.custom_location || '')
    setSelfHostedDay(parseTimestamp(session.self_hosted_start_time).day)
    setSelfHostedStartTime(parseTimestamp(session.self_hosted_start_time).time)
    setSelfHostedEndTime(parseTimestamp(session.self_hosted_end_time).time)
    setSelectedHost(host || null)
    setHostNameText(hostName || '')
    setEditCohosts(cohosts || [])
  }, [session, host, hostName, cohosts])

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

  // Compute IDs to exclude from profile search
  const excludeFromSearch = React.useMemo(() => {
    const ids: string[] = []
    if (selectedHost?.id) ids.push(selectedHost.id)
    editCohosts.forEach((c) => { if (c.user_id) ids.push(c.user_id) })
    return ids
  }, [selectedHost, editCohosts])

  const handleSelectPrimaryHost = (profile: ProfileResult) => {
    // If the new primary host is currently a co-host, remove them from co-hosts
    setEditCohosts((prev) => prev.filter((c) => c.user_id !== profile.id))
    setSelectedHost(profile)
    setHostNameText(profile.display_name || '')
  }

  const handleAddCohost = (profile: ProfileResult) => {
    setEditCohosts((prev) => [...prev, { user_id: profile.id, profile }])
  }

  const handleRemoveCohost = (userId: string) => {
    setEditCohosts((prev) => prev.filter((c) => c.user_id !== userId))
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    const token = getAccessToken()
    if (!token) {
      setError('Session expired. Please log in again.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Build session PATCH body
      const patchBody: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
        format,
        topic_tags: tags.length > 0 ? tags : null,
        track_id: trackId,
        is_self_hosted: isSelfHosted,
        custom_location: isSelfHosted ? customLocation.trim() || null : null,
        self_hosted_start_time: isSelfHosted && selfHostedDay && selfHostedStartTime
          ? buildTimestamp(selfHostedDay, selfHostedStartTime) : null,
        self_hosted_end_time: isSelfHosted && selfHostedDay && selfHostedEndTime
          ? buildTimestamp(selfHostedDay, selfHostedEndTime) : null,
        telegram_group_url: telegramGroupUrl.trim() || null,
      }

      if (isSelfHosted) {
        patchBody.venue_id = null
        patchBody.time_slot_id = null
      }

      if (isAdmin) {
        patchBody.host_id = selectedHost?.id || null
        patchBody.host_name = hostNameText.trim() || null
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/sessions?id=eq.${session.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(patchBody),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update session')
      }

      // Sync co-hosts if admin
      if (isAdmin) {
        const originalIds = new Set((cohosts || []).map((c) => c.user_id))
        const editedIds = new Set(editCohosts.map((c) => c.user_id))

        // Removed co-hosts
        const removed = Array.from(originalIds).filter((id) => !editedIds.has(id))
        // Added co-hosts
        const added = Array.from(editedIds).filter((id) => !originalIds.has(id))

        const headers = {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        }

        await Promise.all([
          ...removed.map((userId) =>
            fetch(
              `${SUPABASE_URL}/rest/v1/session_cohosts?session_id=eq.${session.id}&user_id=eq.${userId}`,
              { method: 'DELETE', headers }
            )
          ),
          ...added.map((userId) =>
            fetch(
              `${SUPABASE_URL}/rest/v1/session_cohosts`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify({ session_id: session.id, user_id: userId }),
              }
            )
          ),
        ])
      }

      onSave()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update session')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-card border rounded-2xl shadow-2xl z-50 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Edit Session</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

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

          {/* Admin-only: Hosts section */}
          {isAdmin && (
            <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <label className="text-sm font-medium">Hosts <span className="text-xs text-muted-foreground">(Admin)</span></label>

              {/* Primary Host */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Primary Host</label>
                {selectedHost ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                    {selectedHost.avatar_url ? (
                      <img src={selectedHost.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {(selectedHost.display_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm flex-1 truncate">{selectedHost.display_name || 'Unnamed'}</span>
                    <button
                      type="button"
                      onClick={() => { setSelectedHost(null); }}
                      className="p-1 rounded hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <ProfileSearch
                    onSelect={handleSelectPrimaryHost}
                    excludeIds={excludeFromSearch}
                    placeholder="Search for primary host..."
                  />
                )}
                <Input
                  value={hostNameText}
                  onChange={(e) => setHostNameText(e.target.value)}
                  placeholder="Host display name (override)"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-filled from profile. Edit to override the displayed name.
                </p>
              </div>

              {/* Co-Hosts */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Co-Hosts</label>
                {editCohosts.length > 0 && (
                  <div className="space-y-1.5">
                    {editCohosts.map((c) => (
                      <div key={c.user_id} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                        {c.profile?.avatar_url ? (
                          <img src={c.profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {(c.profile?.display_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm flex-1 truncate">{c.profile?.display_name || 'Unnamed'}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCohost(c.user_id)}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <ProfileSearch
                  onSelect={handleAddCohost}
                  excludeIds={excludeFromSearch}
                  placeholder="Add co-host..."
                />
              </div>
            </div>
          )}

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
            <div className="grid grid-cols-2 gap-2">
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

          {/* Track */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Track</label>
            <div className="grid grid-cols-2 gap-2">
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

          {/* Self-Hosted Toggle */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Hosting</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSelfHosted(false)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  !isSelfHosted
                    ? 'border-primary bg-primary/10'
                    : 'hover:border-muted-foreground/50'
                )}
              >
                <div className="font-medium text-sm">Official Venue</div>
                <div className="text-xs text-muted-foreground">Assigned by admin</div>
              </button>
              <button
                type="button"
                onClick={() => setIsSelfHosted(true)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  isSelfHosted
                    ? 'border-primary bg-primary/10'
                    : 'hover:border-muted-foreground/50'
                )}
              >
                <div className="font-medium text-sm">Self-Hosted</div>
                <div className="text-xs text-muted-foreground">Your own location</div>
              </button>
            </div>

            {isSelfHosted && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                {/* Day Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Day</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_DAYS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => setSelfHostedDay(selfHostedDay === day.value ? '' : day.value)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-md border text-xs transition-colors',
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Time Range</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selfHostedStartTime}
                        onChange={(e) => setSelfHostedStartTime(e.target.value)}
                        className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="">Start</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <span className="text-xs text-muted-foreground">to</span>
                      <select
                        value={selfHostedEndTime}
                        onChange={(e) => setSelfHostedEndTime(e.target.value)}
                        className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="">End</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Location / Address</label>
                  <Textarea
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Address or directions for attendees..."
                    rows={2}
                    maxLength={300}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Telegram Group URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4" />
              Telegram Group URL (optional)
            </label>
            <Input
              type="url"
              placeholder="https://t.me/your_group"
              value={telegramGroupUrl}
              onChange={(e) => setTelegramGroupUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Add a Telegram group link for attendees to join
            </p>
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

          <p className="text-xs text-muted-foreground">
            Note: Time slot and venue assignment can only be changed by an admin. You can switch to self-hosted at any time.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </>
  )
}
