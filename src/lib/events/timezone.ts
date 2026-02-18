// src/lib/events/timezone.ts

/**
 * Format a date/time in the event's timezone
 */
export function formatInEventTimezone(
  date: Date,
  timezone: string,
  format: 'time' | 'date' | 'datetime' | 'full' = 'datetime'
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  switch (format) {
    case 'time':
      options.hour = 'numeric';
      options.minute = '2-digit';
      break;
    case 'date':
      options.month = 'short';
      options.day = 'numeric';
      break;
    case 'datetime':
      options.month = 'short';
      options.day = 'numeric';
      options.hour = 'numeric';
      options.minute = '2-digit';
      break;
    case 'full':
      options.weekday = 'long';
      options.month = 'long';
      options.day = 'numeric';
      options.year = 'numeric';
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.timeZoneName = 'short';
      break;
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Parse a time string in the event's timezone
 * Input: "09:00" and "2026-02-27"
 * Output: Date object in UTC that represents that time in the event timezone
 */
export function parseTimeInTimezone(
  timeStr: string,
  dateStr: string,
  timezone: string
): Date {
  // Create a date string in the format the timezone-aware parser expects
  const dateTimeStr = `${dateStr}T${timeStr}:00`;

  // Create a formatter that outputs in ISO format for the given timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Parse the local time into a Date object
  // This is a simplified approach - for production, consider using date-fns-tz
  const localDate = new Date(dateTimeStr);

  // Get the offset for this timezone at this date
  const utcDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(localDate.toLocaleString('en-US', { timeZone: timezone }));
  const offset = utcDate.getTime() - tzDate.getTime();

  return new Date(localDate.getTime() + offset);
}

/**
 * Get the timezone abbreviation (e.g., "MST", "MDT")
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(date);

  // Extract just the timezone part
  const parts = formatted.split(' ');
  return parts[parts.length - 1];
}

/**
 * Get list of common timezones for picker
 */
export function getCommonTimezones(): { value: string; label: string }[] {
  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona (MST)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'UTC', label: 'UTC' },
  ];
  return timezones;
}
