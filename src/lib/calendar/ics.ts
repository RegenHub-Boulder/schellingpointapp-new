// src/lib/calendar/ics.ts
// ICS (iCalendar) file generator for session exports

export interface ICSEvent {
  uid: string
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  url?: string
  organizer?: string
}

export interface ICSCalendar {
  name: string
  events: ICSEvent[]
}

/**
 * Escape special characters in ICS values
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Format a Date as ICS datetime (UTC)
 * Format: YYYYMMDDTHHMMSSZ
 */
function formatICSDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Fold long lines per ICS spec (max 75 octets per line)
 */
function foldLine(line: string): string {
  const MAX_LINE_LENGTH = 75
  if (line.length <= MAX_LINE_LENGTH) {
    return line
  }

  const result: string[] = []
  let currentLine = ''

  for (const char of line) {
    if (currentLine.length >= MAX_LINE_LENGTH) {
      result.push(currentLine)
      currentLine = ' ' // Continuation lines start with space
    }
    currentLine += char
  }

  if (currentLine) {
    result.push(currentLine)
  }

  return result.join('\r\n')
}

/**
 * Generate a single VEVENT component
 */
function generateVEvent(event: ICSEvent): string {
  const lines: string[] = []

  lines.push('BEGIN:VEVENT')
  lines.push(`UID:${event.uid}`)
  lines.push(`DTSTAMP:${formatICSDate(new Date())}`)
  lines.push(`DTSTART:${formatICSDate(event.startTime)}`)
  lines.push(`DTEND:${formatICSDate(event.endTime)}`)
  lines.push(`SUMMARY:${escapeICS(event.title)}`)

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`)
  }

  if (event.url) {
    lines.push(`URL:${event.url}`)
  }

  if (event.organizer) {
    lines.push(`ORGANIZER;CN=${escapeICS(event.organizer)}:mailto:noreply@schellingpoint.io`)
  }

  lines.push('END:VEVENT')

  return lines.map(foldLine).join('\r\n')
}

/**
 * Generate a complete ICS calendar file
 */
export function generateICS(calendar: ICSCalendar): string {
  const lines: string[] = []

  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//Schelling Point//Event Calendar//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push(`X-WR-CALNAME:${escapeICS(calendar.name)}`)

  const eventsICS = calendar.events.map(generateVEvent).join('\r\n')
  lines.push(eventsICS)

  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Generate ICS for a single event
 */
export function generateSingleEventICS(event: ICSEvent, calendarName: string): string {
  return generateICS({
    name: calendarName,
    events: [event],
  })
}

/**
 * Generate a Google Calendar URL for an event
 */
export function generateGoogleCalendarURL(event: ICSEvent): string {
  const startTime = formatICSDate(event.startTime).replace('Z', '')
  const endTime = formatICSDate(event.endTime).replace('Z', '')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startTime}Z/${endTime}Z`,
  })

  if (event.description) {
    params.set('details', event.description)
  }

  if (event.location) {
    params.set('location', event.location)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate an Outlook/Office 365 calendar URL for an event
 */
export function generateOutlookCalendarURL(event: ICSEvent): string {
  const startTime = event.startTime.toISOString()
  const endTime = event.endTime.toISOString()

  const params = new URLSearchParams({
    rru: 'addevent',
    startdt: startTime,
    enddt: endTime,
    subject: event.title,
    allday: 'false',
  })

  if (event.description) {
    params.set('body', event.description)
  }

  if (event.location) {
    params.set('location', event.location)
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Generate a Yahoo Calendar URL for an event
 */
export function generateYahooCalendarURL(event: ICSEvent): string {
  const startTime = formatICSDate(event.startTime).replace('Z', '')
  const endTime = formatICSDate(event.endTime).replace('Z', '')

  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: startTime,
    et: endTime,
    type: '20', // 20 = event
  })

  if (event.description) {
    params.set('desc', event.description)
  }

  if (event.location) {
    params.set('in_loc', event.location)
  }

  return `https://calendar.yahoo.com/?${params.toString()}`
}
