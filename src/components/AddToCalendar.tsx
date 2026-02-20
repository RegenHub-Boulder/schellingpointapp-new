'use client'

import * as React from 'react'
import { Calendar, ChevronDown, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  generateGoogleCalendarURL,
  generateOutlookCalendarURL,
  generateYahooCalendarURL,
  type ICSEvent,
} from '@/lib/calendar/ics'

interface AddToCalendarProps {
  /** Session data for calendar event */
  session: {
    id: string
    title: string
    description?: string
    host_name?: string
    time_slot?: {
      start_time: string
      end_time: string
    } | null
    venue?: {
      name: string
      address?: string
    } | null
  }
  /** Event slug for ICS download URL */
  eventSlug: string
  /** Event location fallback */
  eventLocation?: string | null
  /** Variant: 'default' for full button, 'icon' for icon-only */
  variant?: 'default' | 'icon' | 'outline'
  /** Size of the button */
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function AddToCalendar({
  session,
  eventSlug,
  eventLocation,
  variant = 'default',
  size = 'default',
}: AddToCalendarProps) {
  const timeSlot = session.time_slot

  // Don't render if session isn't scheduled
  if (!timeSlot?.start_time || !timeSlot?.end_time) {
    return null
  }

  // Build location string
  let location = session.venue?.name || eventLocation || ''
  if (session.venue?.address) {
    location += `, ${session.venue.address}`
  }

  // Build description
  let description = session.description || ''
  if (session.host_name) {
    description = `Host: ${session.host_name}\n\n${description}`
  }
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const sessionUrl = `${baseUrl}/e/${eventSlug}/sessions/${session.id}`
  description += `\n\nView session: ${sessionUrl}`

  const icsEvent: ICSEvent = {
    uid: `session-${session.id}@schellingpoint.io`,
    title: session.title,
    description: description.trim(),
    location,
    startTime: new Date(timeSlot.start_time),
    endTime: new Date(timeSlot.end_time),
    url: sessionUrl,
    organizer: session.host_name,
  }

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarURL(icsEvent)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleOutlookCalendar = () => {
    const url = generateOutlookCalendarURL(icsEvent)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleYahooCalendar = () => {
    const url = generateYahooCalendarURL(icsEvent)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadICS = () => {
    const icsUrl = `/api/v1/events/${eventSlug}/sessions/${session.id}/calendar`
    window.location.href = icsUrl
  }

  const buttonVariant = variant === 'outline' ? 'outline' : 'ghost'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={buttonVariant} size={size}>
          <Calendar className="h-4 w-4" />
          {variant === 'default' && (
            <>
              <span className="ml-2">Add to Calendar</span>
              <ChevronDown className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOutlookCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Outlook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleYahooCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Yahoo Calendar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDownloadICS}>
          <Download className="h-4 w-4 mr-2" />
          Download .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ExportScheduleButtonProps {
  eventSlug: string
  eventName: string
  /** Whether to export favorites only */
  favoritesOnly?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function ExportScheduleButton({
  eventSlug,
  eventName,
  favoritesOnly = false,
  variant = 'outline',
  size = 'default',
}: ExportScheduleButtonProps) {
  const handleDownload = () => {
    const params = favoritesOnly ? '?favorites=true' : ''
    window.location.href = `/api/v1/events/${eventSlug}/calendar${params}`
  }

  return (
    <Button variant={variant} size={size} onClick={handleDownload}>
      <Download className="h-4 w-4 mr-2" />
      {favoritesOnly ? 'Export My Schedule' : 'Export Full Schedule'}
    </Button>
  )
}
