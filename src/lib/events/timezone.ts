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
 *
 * Example: parseTimeInTimezone("09:00", "2026-02-27", "America/Denver")
 * Returns a Date representing 09:00 AM Mountain Time on Feb 27, 2026 (as UTC)
 */
export function parseTimeInTimezone(
  timeStr: string,
  dateStr: string,
  timezone: string
): Date {
  // Create the full date-time string
  const dateTimeStr = `${dateStr}T${timeStr}:00`;

  // Strategy: Create a date using the parts from the input, then figure out
  // the offset for the target timezone at that moment.

  // Parse the date/time components directly
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Create a date in UTC with these components
  // This gives us a "reference point" - e.g., 09:00 on Feb 27 in UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

  // Now we need to adjust: if it's 09:00 in Mountain Time, what is that in UTC?
  // Mountain Time is typically UTC-7 (or UTC-6 in daylight saving)
  // So 09:00 MT = 16:00 UTC (in winter)

  // Use Intl.DateTimeFormat to get the timezone offset
  // We format the UTC date in the target timezone and see what time it shows
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Format the UTC reference date in the target timezone
  const parts = formatter.formatToParts(utcDate);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';

  const tzHours = parseInt(getPart('hour'), 10);
  const tzMinutes = parseInt(getPart('minute'), 10);

  // Calculate the offset: how many hours/minutes difference between UTC and target timezone
  // If utcDate is 09:00 UTC and target timezone shows 02:00, offset is -7 hours
  const tzTotalMinutes = tzHours * 60 + tzMinutes;
  const utcTotalMinutes = hours * 60 + minutes;
  let offsetMinutes = tzTotalMinutes - utcTotalMinutes;

  // Handle day boundary crossings
  if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60;
  if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;

  // Adjust: we want input time to BE in the target timezone
  // So we subtract the offset to get UTC time
  return new Date(utcDate.getTime() - offsetMinutes * 60 * 1000);
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
