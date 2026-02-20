'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserCheck, UserPlus, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useEvent } from '@/contexts/EventContext'
import { cn } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface RSVPButtonProps {
  sessionId: string
  /** Current confirmed RSVP count */
  rsvpCount: number
  /** Current waitlist count */
  waitlistCount: number
  /** Venue capacity (null = unlimited) */
  capacity: number | null
  /** Initial user RSVP status */
  initialStatus?: 'confirmed' | 'waitlist' | null
  /** Initial waitlist position (if on waitlist) */
  initialWaitlistPosition?: number | null
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost'
  /** Button size */
  size?: 'default' | 'sm' | 'lg'
  /** Show capacity info */
  showCapacity?: boolean
  /** Callback when RSVP changes */
  onRSVPChange?: (status: 'confirmed' | 'waitlist' | null) => void
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

export function RSVPButton({
  sessionId,
  rsvpCount,
  waitlistCount,
  capacity,
  initialStatus = null,
  initialWaitlistPosition = null,
  variant = 'default',
  size = 'default',
  showCapacity = true,
  onRSVPChange,
}: RSVPButtonProps) {
  const router = useRouter()
  const { user } = useAuth()
  const event = useEvent()

  const [status, setStatus] = React.useState<'confirmed' | 'waitlist' | null>(initialStatus)
  const [waitlistPosition, setWaitlistPosition] = React.useState<number | null>(initialWaitlistPosition)
  const [isLoading, setIsLoading] = React.useState(false)
  const [localRsvpCount, setLocalRsvpCount] = React.useState(rsvpCount)
  const [localWaitlistCount, setLocalWaitlistCount] = React.useState(waitlistCount)

  // Determine if there's room
  const hasRoom = capacity === null || localRsvpCount < capacity
  const spotsLeft = capacity !== null ? capacity - localRsvpCount : null

  const handleRSVP = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    const token = getAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    setIsLoading(true)

    try {
      if (status) {
        // Cancel RSVP
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/session_rsvps?user_id=eq.${user.id}&session_id=eq.${sessionId}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (response.ok) {
          // Optimistic update
          if (status === 'confirmed') {
            setLocalRsvpCount(prev => Math.max(0, prev - 1))
          } else {
            setLocalWaitlistCount(prev => Math.max(0, prev - 1))
          }
          setStatus(null)
          setWaitlistPosition(null)
          onRSVPChange?.(null)
        } else {
          throw new Error('Failed to cancel RSVP')
        }
      } else {
        // Create RSVP
        const newStatus = hasRoom ? 'confirmed' : 'waitlist'
        const newWaitlistPosition = hasRoom ? null : localWaitlistCount + 1

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/session_rsvps`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              event_id: event.id,
              session_id: sessionId,
              user_id: user.id,
              status: newStatus,
              waitlist_position: newWaitlistPosition,
            }),
          }
        )

        if (response.ok) {
          // Optimistic update
          if (newStatus === 'confirmed') {
            setLocalRsvpCount(prev => prev + 1)
          } else {
            setLocalWaitlistCount(prev => prev + 1)
          }
          setStatus(newStatus)
          setWaitlistPosition(newWaitlistPosition)
          onRSVPChange?.(newStatus)
        } else {
          throw new Error('Failed to RSVP')
        }
      }
    } catch (err) {
      console.error('Error with RSVP:', err)
      // Could add toast notification here
    } finally {
      setIsLoading(false)
    }
  }

  // Render different states
  const renderButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>Loading...</span>
        </>
      )
    }

    if (status === 'confirmed') {
      return (
        <>
          <UserCheck className="h-4 w-4 mr-2" />
          <span>You&apos;re going</span>
        </>
      )
    }

    if (status === 'waitlist') {
      return (
        <>
          <Clock className="h-4 w-4 mr-2" />
          <span>On waitlist{waitlistPosition ? ` (#${waitlistPosition})` : ''}</span>
        </>
      )
    }

    if (!hasRoom) {
      return (
        <>
          <Clock className="h-4 w-4 mr-2" />
          <span>Join waitlist</span>
        </>
      )
    }

    return (
      <>
        <UserPlus className="h-4 w-4 mr-2" />
        <span>RSVP</span>
      </>
    )
  }

  const buttonVariant = status ? 'default' : (hasRoom ? variant : 'outline')

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant={buttonVariant}
        size={size}
        onClick={handleRSVP}
        disabled={isLoading}
        className={cn(
          status === 'confirmed' && 'bg-green-600 hover:bg-green-700 text-white',
          status === 'waitlist' && 'bg-amber-500 hover:bg-amber-600 text-white'
        )}
      >
        {renderButtonContent()}
      </Button>

      {showCapacity && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {capacity !== null ? (
            <span>
              {localRsvpCount}/{capacity} spots
              {spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 && (
                <span className="text-amber-500 ml-1">({spotsLeft} left)</span>
              )}
              {spotsLeft === 0 && (
                <span className="text-red-500 ml-1">(Full)</span>
              )}
            </span>
          ) : (
            <span>{localRsvpCount} attending</span>
          )}
          {localWaitlistCount > 0 && (
            <span className="text-muted-foreground">
              + {localWaitlistCount} waitlisted
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Compact RSVP indicator for session cards
 */
export function RSVPIndicator({
  rsvpCount,
  capacity,
  userStatus,
}: {
  rsvpCount: number
  capacity: number | null
  userStatus?: 'confirmed' | 'waitlist' | null
}) {
  const spotsLeft = capacity !== null ? capacity - rsvpCount : null
  const isFull = spotsLeft !== null && spotsLeft <= 0

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className={cn(
        isFull && 'text-red-500',
        spotsLeft !== null && spotsLeft <= 3 && spotsLeft > 0 && 'text-amber-500'
      )}>
        {capacity !== null ? `${rsvpCount}/${capacity}` : rsvpCount}
      </span>
      {userStatus === 'confirmed' && (
        <span className="text-green-600 text-xs font-medium">(Going)</span>
      )}
      {userStatus === 'waitlist' && (
        <span className="text-amber-500 text-xs font-medium">(Waitlist)</span>
      )}
    </div>
  )
}
