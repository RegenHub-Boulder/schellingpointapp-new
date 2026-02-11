'use client'

import * as React from 'react'
import Link from 'next/link'
import { Heart, Mic, Wrench, MessageSquare, Users, Monitor, Plus, Minus, MapPin, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, votesToCredits, nextVoteCost } from '@/lib/utils'

const formatIcons: Record<string, React.ReactNode> = {
  talk: <Mic className="h-4 w-4" />,
  workshop: <Wrench className="h-4 w-4" />,
  discussion: <MessageSquare className="h-4 w-4" />,
  panel: <Users className="h-4 w-4" />,
  demo: <Monitor className="h-4 w-4" />,
}

// Format time from ISO string to readable format (e.g., "9:00 AM")
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

interface SessionCardProps {
  session: {
    id: string
    title: string
    description: string | null
    format: string
    duration: number
    host_name: string | null
    topic_tags: string[] | null
    total_votes: number
    status: string
    venue?: { name: string } | null
    time_slot?: { label: string; start_time: string } | null
    is_self_hosted?: boolean
    custom_location?: string | null
    track?: { id: string; name: string; color: string | null } | null
  }
  userVotes?: number
  isFavorited?: boolean
  remainingCredits: number
  onVote?: (sessionId: string, newVoteCount: number) => void
  onToggleFavorite?: (sessionId: string) => void
  showVoting?: boolean
  isLoggedIn?: boolean
}

export function SessionCard({
  session,
  userVotes = 0,
  isFavorited = false,
  remainingCredits,
  onVote,
  onToggleFavorite,
  showVoting = true,
  isLoggedIn = false,
}: SessionCardProps) {
  const currentCredits = votesToCredits(userVotes)
  const costToAdd = nextVoteCost(userVotes)
  const canAddVote = remainingCredits >= costToAdd

  const handleAddVote = () => {
    if (canAddVote && onVote) {
      onVote(session.id, userVotes + 1)
    }
  }

  const handleRemoveVote = () => {
    if (userVotes > 0 && onVote) {
      onVote(session.id, userVotes - 1)
    }
  }

  return (
    <Card className="overflow-hidden card-hover group border-border/50 hover:border-primary/30">
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <Link href={`/sessions/${session.id}`} className="flex-1 min-w-0 cursor-pointer">
              <div className="flex items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground mb-1.5 flex-wrap">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  {formatIcons[session.format] || <Mic className="h-4 w-4" />}
                  <span className="capitalize">{session.format}</span>
                </span>
                <span className="text-muted-foreground/50">•</span>
                <span className="whitespace-nowrap">{session.duration} min</span>
                {session.track && (
                  <>
                    <span className="text-muted-foreground/50 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1 w-full sm:w-auto mt-0.5 sm:mt-0">
                      {session.track.color && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: session.track.color }}
                        />
                      )}
                      <span className="truncate text-xs sm:text-sm">{session.track.name}</span>
                    </span>
                  </>
                )}
              </div>
              <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {session.title}
                <ChevronRight className="inline h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              {session.host_name && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-nowrap">
                  by {session.host_name}
                </p>
              )}
            </Link>

            {/* Favorite Button */}
            {onToggleFavorite && isLoggedIn && (
              <button
                onClick={() => onToggleFavorite(session.id)}
                title={isFavorited ? 'Remove from My Schedule' : 'Save to My Schedule'}
                className={cn(
                  'p-2.5 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
                  isFavorited
                    ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
                    : 'text-muted-foreground hover:text-red-500 hover:bg-muted'
                )}
              >
                <Heart className={cn('h-5 w-5', isFavorited && 'fill-current')} />
              </button>
            )}
          </div>

          {/* Description */}
          <Link href={`/sessions/${session.id}`} className="block">
            {session.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 hover:text-foreground/80 transition-colors">
                {session.description}
              </p>
            )}
          </Link>

          {/* Tags */}
          {session.topic_tags && session.topic_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {session.topic_tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Scheduled info */}
          {(session.venue || session.is_self_hosted) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {session.is_self_hosted ? (
                  <span className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">Self-Hosted</Badge>
                  </span>
                ) : session.venue ? (
                  <span>{session.venue.name}</span>
                ) : null}
              </div>
              {session.time_slot?.start_time && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(session.time_slot.start_time)}</span>
                </div>
              )}
            </div>
          )}

          {/* Vote stats */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="text-sm">
              <span className="font-semibold text-primary neon-text">{session.total_votes}</span>
              <span className="text-muted-foreground"> total votes</span>
            </div>

            {/* Voting controls */}
            {showVoting && isLoggedIn && onVote && (
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleRemoveVote}
                  disabled={userVotes === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <div className="min-w-[60px] text-center">
                  <div className="font-semibold">{userVotes}</div>
                  <div className="text-xs text-muted-foreground">{currentCredits} cr</div>
                </div>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAddVote}
                  disabled={!canAddVote}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
