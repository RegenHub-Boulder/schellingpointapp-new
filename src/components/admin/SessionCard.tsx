'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  X,
  Calendar,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Mail,
  MailCheck,
  ExternalLink,
  ThumbsUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SessionStatus = 'pending' | 'approved' | 'rejected' | 'scheduled'

interface Session {
  id: string
  title: string
  description: string | null
  format: string
  duration: number
  host_name: string | null
  topic_tags: string[] | null
  total_votes: number
  status: SessionStatus
  time_preferences: string[] | null
  venue_id: string | null
  time_slot_id: string | null
  host_notified_at: string | null
  venue?: { id: string; name: string } | null
  time_slot?: { id: string; label: string; start_time: string } | null
}

interface Venue {
  id: string
  name: string
  capacity: number
}

interface TimeSlot {
  id: string
  label: string
  start_time: string
  end_time: string
}

interface SessionCardProps {
  session: Session
  eventSlug: string
  venues?: Venue[]
  timeSlots?: TimeSlot[]
  onApprove?: () => void
  onReject?: () => void
  onSchedule?: (venueId: string, timeSlotId: string) => void
  onUnschedule?: () => void
  onDelete?: () => void
  onNotify?: () => void
}

export function SessionCard({
  session,
  eventSlug,
  venues = [],
  timeSlots = [],
  onApprove,
  onReject,
  onSchedule,
  onUnschedule,
  onDelete,
  onNotify,
}: SessionCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [showScheduler, setShowScheduler] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [selectedVenue, setSelectedVenue] = React.useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = React.useState('')

  const handleSchedule = () => {
    if (selectedVenue && selectedTimeSlot && onSchedule) {
      onSchedule(selectedVenue, selectedTimeSlot)
      setShowScheduler(false)
      setSelectedVenue('')
      setSelectedTimeSlot('')
    }
  }

  const isPending = session.status === 'pending'
  const isApproved = session.status === 'approved'
  const isScheduled = session.status === 'scheduled'
  const isRejected = session.status === 'rejected'

  // Format time preferences for display
  const formatPref = (pref: string) =>
    pref.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <Card className={cn(
      'transition-all',
      isRejected && 'opacity-60',
      isScheduled && 'border-green-500/20 bg-green-500/5'
    )}>
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Meta badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={isScheduled ? 'default' : isApproved ? 'secondary' : 'outline'}
                  className="capitalize text-xs"
                >
                  {session.format}
                </Badge>
                <span className="text-xs text-muted-foreground">{session.duration} min</span>
                {session.total_votes > 0 && (
                  <span className="text-xs font-medium text-primary flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {session.total_votes}
                  </span>
                )}
                {isScheduled && session.host_notified_at && (
                  <Badge variant="outline" className="text-xs border-green-500/50 text-green-700 dark:text-green-400 bg-green-500/10">
                    <MailCheck className="h-3 w-3 mr-1" />
                    Notified
                  </Badge>
                )}
                {isScheduled && !session.host_notified_at && (
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10">
                    <Mail className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold line-clamp-1">{session.title}</h3>

              {/* Host */}
              {session.host_name && (
                <p className="text-sm text-muted-foreground">by {session.host_name}</p>
              )}
            </div>

            {/* Expand toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Scheduled Info (always visible when scheduled) */}
          {isScheduled && (session.venue || session.time_slot) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm bg-green-500/10 rounded-lg p-3">
              {session.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>{session.venue.name}</span>
                </div>
              )}
              {session.time_slot && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>{session.time_slot.label}</span>
                </div>
              )}
            </div>
          )}

          {/* Expanded Content */}
          {isExpanded && (
            <div className="pt-2 space-y-3 border-t">
              {/* Description */}
              {session.description && (
                <p className="text-sm text-muted-foreground">{session.description}</p>
              )}

              {/* Tags */}
              {session.topic_tags && session.topic_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {session.topic_tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Time Preferences */}
              {session.time_preferences && session.time_preferences.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs text-muted-foreground">Prefers:</span>
                  {session.time_preferences.map((pref) => (
                    <Badge
                      key={pref}
                      variant="outline"
                      className="text-xs border-blue-500/50 text-blue-700 dark:text-blue-400 bg-blue-500/10"
                    >
                      {formatPref(pref)}
                    </Badge>
                  ))}
                </div>
              )}

              {/* View Link */}
              <Link
                href={`/e/${eventSlug}/sessions/${session.id}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View full session
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Quick Scheduling (for approved sessions) */}
          {isApproved && showScheduler && (
            <div className="pt-3 border-t space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Venue</label>
                  <select
                    value={selectedVenue}
                    onChange={(e) => setSelectedVenue(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select venue...</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name} {venue.capacity ? `(${venue.capacity})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Time Slot</label>
                  <select
                    value={selectedTimeSlot}
                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select time...</option>
                    {timeSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowScheduler(false)}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSchedule}
                  disabled={!selectedVenue || !selectedTimeSlot}
                  className="flex-1 sm:flex-none"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirm
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t flex-wrap">
            {/* Pending Actions */}
            {isPending && (
              <>
                <Button size="sm" variant="outline" onClick={onReject} className="flex-1 sm:flex-none">
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button size="sm" onClick={onApprove} className="flex-1 sm:flex-none">
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </>
            )}

            {/* Approved Actions */}
            {isApproved && !showScheduler && (
              <Button
                size="sm"
                onClick={() => setShowScheduler(true)}
                className="flex-1 sm:flex-none"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Quick Schedule
              </Button>
            )}

            {/* Scheduled Actions */}
            {isScheduled && (
              <>
                <Button size="sm" variant="outline" onClick={onUnschedule} className="flex-1 sm:flex-none">
                  Unschedule
                </Button>
                {!session.host_notified_at && onNotify && (
                  <Button size="sm" variant="outline" onClick={onNotify} className="flex-1 sm:flex-none">
                    <Mail className="h-4 w-4 mr-1" />
                    Notify Host
                  </Button>
                )}
              </>
            )}

            {/* Delete (always available except rejected) */}
            {!isRejected && onDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 sm:ml-auto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-card border rounded-xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-2">Delete Session?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              "{session.title}" will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  onDelete?.()
                  setShowDeleteConfirm(false)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
