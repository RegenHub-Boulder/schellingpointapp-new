'use client'

import * as React from 'react'
import { X, Loader2 } from 'lucide-react'
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
  }
  onSave: () => void
}

export function EditSessionModal({ isOpen, onClose, session, onSave }: EditSessionModalProps) {
  const { tracks } = useTracks()
  const [title, setTitle] = React.useState(session.title)
  const [description, setDescription] = React.useState(session.description || '')
  const [format, setFormat] = React.useState(session.format)
  const [tags, setTags] = React.useState<string[]>(session.topic_tags || [])
  const [trackId, setTrackId] = React.useState<string | null>(session.track_id || null)
  const [customTag, setCustomTag] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Reset form when session changes
  React.useEffect(() => {
    setTitle(session.title)
    setDescription(session.description || '')
    setFormat(session.format)
    setTags(session.topic_tags || [])
    setTrackId(session.track_id || null)
  }, [session])

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
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            format,
            topic_tags: tags.length > 0 ? tags : null,
            track_id: trackId,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update session')
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
            Note: Time slot and venue can only be changed by an admin.
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
