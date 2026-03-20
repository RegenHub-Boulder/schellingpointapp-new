'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  X,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AdminNav } from '@/components/admin/AdminNav'
import { useAuth } from '@/hooks/useAuth'
import { useEvent, useEventRole } from '@/contexts/EventContext'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// Predefined color palette
const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#64748b', '#475569',
]

interface Track {
  id: string
  name: string
  slug: string
  color: string | null
  description: string | null
  is_active: boolean
  display_order: number
  session_count?: number
}

interface TrackFormData {
  name: string
  color: string
  description: string
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function AdminTracksPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { user, isLoading: authLoading } = useAuth()
  const event = useEvent()
  const { isAdmin, isLoading: roleLoading, can } = useEventRole()
  const supabase = React.useMemo(() => createClient(), [])

  const [tracks, setTracks] = React.useState<Track[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Edit/Create state
  const [editingTrack, setEditingTrack] = React.useState<Track | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const [formData, setFormData] = React.useState<TrackFormData>({
    name: '',
    color: COLOR_PALETTE[0],
    description: '',
  })
  const [isSaving, setIsSaving] = React.useState(false)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Drag state
  const [draggedTrack, setDraggedTrack] = React.useState<Track | null>(null)

  // Redirect if not admin
  React.useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !isAdmin)) {
      router.push(`/e/${event.slug}/sessions`)
    }
  }, [user, isAdmin, authLoading, roleLoading, router, event.slug])

  // Fetch tracks
  const fetchTracks = React.useCallback(async () => {
    try {
      // Get tracks with session counts
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('event_id', event.id)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (!error && data) {
        // Get session counts per track
        const { data: sessions, error: countsError } = await supabase
          .from('sessions')
          .select('track_id')
          .eq('event_id', event.id)

        const countMap = new Map<string, number>()
        if (!countsError && sessions) {
          sessions.forEach((s: any) => {
            if (s.track_id) {
              countMap.set(s.track_id, (countMap.get(s.track_id) || 0) + 1)
            }
          })
        }

        setTracks(
          data.map((t: Track) => ({
            ...t,
            session_count: countMap.get(t.id) || 0,
          }))
        )
      }
    } catch (err) {
      console.error('Error fetching tracks:', err)
      setError('Failed to load tracks')
    } finally {
      setIsLoading(false)
    }
  }, [event.id, supabase])

  React.useEffect(() => {
    fetchTracks()
  }, [fetchTracks])

  // Handle create/edit
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Track name is required')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setError('Session expired. Please log in again.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      if (editingTrack) {
        // Update existing track
        const { error } = await supabase
          .from('tracks')
          .update({
            name: formData.name.trim(),
            slug: generateSlug(formData.name),
            color: formData.color,
            description: formData.description.trim() || null,
          })
          .eq('id', editingTrack.id)

        if (error) {
          throw new Error('Failed to update track')
        }
      } else {
        // Create new track
        const maxOrder = tracks.reduce((max, t) => Math.max(max, t.display_order || 0), 0)

        const { error } = await supabase
          .from('tracks')
          .insert({
            event_id: event.id,
            name: formData.name.trim(),
            slug: generateSlug(formData.name),
            color: formData.color,
            description: formData.description.trim() || null,
            is_active: true,
            display_order: maxOrder + 1,
          })

        if (error) {
          throw new Error('Failed to create track')
        }
      }

      // Reset form and refresh
      setEditingTrack(null)
      setIsCreating(false)
      setFormData({ name: '', color: COLOR_PALETTE[0], description: '' })
      await fetchTracks()
    } catch (err) {
      console.error('Error saving track:', err)
      setError(editingTrack ? 'Failed to update track' : 'Failed to create track')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async (trackId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    setIsDeleting(true)

    try {
      // First, clear track_id from any sessions using this track
      await supabase
        .from('sessions')
        .update({ track_id: null })
        .eq('track_id', trackId)

      // Then delete the track
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId)

      if (error) {
        throw new Error('Failed to delete track')
      }

      setDeleteConfirm(null)
      await fetchTracks()
    } catch (err) {
      console.error('Error deleting track:', err)
      setError('Failed to delete track')
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle reorder (drag and drop)
  const handleDrop = async (targetTrack: Track) => {
    if (!draggedTrack || draggedTrack.id === targetTrack.id) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    // Calculate new order
    const sourceIndex = tracks.findIndex((t) => t.id === draggedTrack.id)
    const targetIndex = tracks.findIndex((t) => t.id === targetTrack.id)

    const newTracks = [...tracks]
    newTracks.splice(sourceIndex, 1)
    newTracks.splice(targetIndex, 0, draggedTrack)

    // Update display_order for all tracks
    const updates = newTracks.map((t, i) => ({
      id: t.id,
      display_order: i,
    }))

    setTracks(newTracks.map((t, i) => ({ ...t, display_order: i })))

    // Update in database
    for (const update of updates) {
      await supabase
        .from('tracks')
        .update({ display_order: update.display_order })
        .eq('id', update.id)
    }

    setDraggedTrack(null)
  }

  // Start editing
  const startEdit = (track: Track) => {
    setEditingTrack(track)
    setIsCreating(false)
    setFormData({
      name: track.name,
      color: track.color || COLOR_PALETTE[0],
      description: track.description || '',
    })
  }

  // Start creating
  const startCreate = () => {
    setIsCreating(true)
    setEditingTrack(null)
    setFormData({ name: '', color: COLOR_PALETTE[0], description: '' })
  }

  // Cancel edit/create
  const cancelEdit = () => {
    setEditingTrack(null)
    setIsCreating(false)
    setFormData({ name: '', color: COLOR_PALETTE[0], description: '' })
    setError(null)
  }

  if (authLoading || roleLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav eventSlug={slug} canManageSchedule={true} canManageVenues={true} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav eventSlug={slug} canManageSchedule={can('manageSchedule')} canManageVenues={can('manageVenues')} />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Track Management</h1>
            <p className="text-muted-foreground">Organize sessions by topic or theme</p>
          </div>
          {!isCreating && !editingTrack && (
            <Button onClick={startCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Track
            </Button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Create/Edit Form */}
        {(isCreating || editingTrack) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingTrack ? 'Edit Track' : 'Create Track'}</CardTitle>
              <CardDescription>
                {editingTrack ? 'Update track details' : 'Add a new track for organizing sessions'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Technical, Governance, Community"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={cn(
                        'w-8 h-8 rounded-full transition-transform',
                        formData.color === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what sessions belong in this track..."
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">{formData.description.length}/200</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={cancelEdit} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingTrack ? 'Save Changes' : 'Create Track'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Track List */}
        <Card>
          <CardHeader>
            <CardTitle>Tracks ({tracks.length})</CardTitle>
            <CardDescription>
              Drag to reorder. Tracks appear in this order in session forms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tracks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No tracks created yet.
                <br />
                <Button variant="link" onClick={startCreate} className="mt-2">
                  Create your first track
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={() => setDraggedTrack(track)}
                    onDragEnd={() => setDraggedTrack(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(track)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border bg-background transition-colors',
                      draggedTrack?.id === track.id && 'opacity-50',
                      draggedTrack && draggedTrack.id !== track.id && 'border-dashed'
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move flex-shrink-0" />

                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: track.color || '#64748b' }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{track.name}</span>
                        {!track.is_active && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      {track.description && (
                        <p className="text-sm text-muted-foreground truncate">{track.description}</p>
                      )}
                    </div>

                    <Badge variant="secondary" className="flex-shrink-0">
                      {track.session_count || 0} sessions
                    </Badge>

                    {deleteConfirm === track.id ? (
                      <div className="flex items-center gap-2">
                        {(track.session_count || 0) > 0 && (
                          <span className="text-xs text-destructive">
                            {track.session_count} sessions will lose their track
                          </span>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(track.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(null)}
                          disabled={isDeleting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(track)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(track.id)}
                          className="text-destructive hover:text-destructive"
                          title={(track.session_count || 0) > 0 ? `${track.session_count} sessions use this track` : 'Delete track'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
