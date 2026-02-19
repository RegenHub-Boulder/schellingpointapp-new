'use client';

import * as React from 'react';
import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { WizardState, WizardAction, LocationType } from '../useWizardState';

// ============================================================================
// Types
// ============================================================================

interface DatesStepProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

interface TimezoneOption {
  value: string;
  label: string;
  abbreviation: string;
}

// ============================================================================
// Constants
// ============================================================================

// Popular timezones to show first
const POPULAR_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string; description: string }[] = [
  { value: 'in-person', label: 'In-person', description: 'Physical venue' },
  { value: 'virtual', label: 'Virtual', description: 'Online only' },
  { value: 'hybrid', label: 'Hybrid', description: 'Both physical and virtual attendance' },
];

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get timezone abbreviation for display
 */
function getTimezoneAbbreviation(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((part) => part.type === 'timeZoneName');
    return tzPart?.value || '';
  } catch {
    return '';
  }
}

/**
 * Get all available timezones with labels
 */
function getAllTimezones(): TimezoneOption[] {
  try {
    const timezones = Intl.supportedValuesOf('timeZone');
    return timezones.map((tz) => {
      const abbreviation = getTimezoneAbbreviation(tz);
      return {
        value: tz,
        label: tz.replace(/_/g, ' '),
        abbreviation,
      };
    });
  } catch {
    // Fallback for older browsers
    return POPULAR_TIMEZONES.map((tz) => ({
      value: tz,
      label: tz.replace(/_/g, ' '),
      abbreviation: getTimezoneAbbreviation(tz),
    }));
  }
}

/**
 * Sort timezones: popular first, then alphabetically
 */
function sortTimezones(timezones: TimezoneOption[]): TimezoneOption[] {
  const popularSet = new Set(POPULAR_TIMEZONES);
  const popular: TimezoneOption[] = [];
  const others: TimezoneOption[] = [];

  timezones.forEach((tz) => {
    if (popularSet.has(tz.value)) {
      popular.push(tz);
    } else {
      others.push(tz);
    }
  });

  // Sort popular by their order in POPULAR_TIMEZONES
  popular.sort((a, b) => {
    return POPULAR_TIMEZONES.indexOf(a.value) - POPULAR_TIMEZONES.indexOf(b.value);
  });

  // Sort others alphabetically
  others.sort((a, b) => a.label.localeCompare(b.label));

  return [...popular, ...others];
}

// ============================================================================
// Searchable Timezone Select Component
// ============================================================================

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  timezones: TimezoneOption[];
}

function TimezoneSelect({ value, onChange, timezones }: TimezoneSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter timezones based on search query
  const filteredTimezones = useMemo(() => {
    if (!searchQuery.trim()) {
      return timezones;
    }
    const query = searchQuery.toLowerCase();
    return timezones.filter(
      (tz) =>
        tz.label.toLowerCase().includes(query) ||
        tz.value.toLowerCase().includes(query) ||
        tz.abbreviation.toLowerCase().includes(query)
    );
  }, [timezones, searchQuery]);

  // Get the display value for the selected timezone
  const selectedTimezone = useMemo(() => {
    return timezones.find((tz) => tz.value === value);
  }, [timezones, value]);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredTimezones]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, filteredTimezones.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredTimezones[highlightedIndex]) {
            onChange(filteredTimezones[highlightedIndex].value);
            setIsOpen(false);
            setSearchQuery('');
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          break;
      }
    },
    [isOpen, filteredTimezones, highlightedIndex, onChange]
  );

  const handleSelect = useCallback(
    (timezone: TimezoneOption) => {
      onChange(timezone.value);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const displayValue = selectedTimezone
    ? `${selectedTimezone.label} (${selectedTimezone.abbreviation})`
    : 'Select timezone...';

  // Split into popular and other timezones for display
  const popularSet = new Set(POPULAR_TIMEZONES);
  const popularFiltered = filteredTimezones.filter((tz) => popularSet.has(tz.value));
  const otherFiltered = filteredTimezones.filter((tz) => !popularSet.has(tz.value));
  const showSections = !searchQuery.trim() && popularFiltered.length > 0 && otherFiltered.length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button / search input */}
      <div
        className={cn(
          'flex h-10 w-full items-center rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring',
          isOpen && 'ring-2 ring-ring'
        )}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search timezone..."
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 text-left outline-none"
          >
            {displayValue}
          </button>
        )}
        <svg
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {filteredTimezones.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No timezones found</li>
          ) : showSections ? (
            <>
              <li className="px-2 py-1 text-xs font-medium text-muted-foreground">Popular</li>
              {popularFiltered.map((tz, index) => (
                <li
                  key={tz.value}
                  role="option"
                  aria-selected={tz.value === value}
                  onClick={() => handleSelect(tz)}
                  className={cn(
                    'cursor-pointer rounded px-3 py-2 text-sm',
                    index === highlightedIndex && 'bg-accent text-accent-foreground',
                    tz.value === value && 'font-medium'
                  )}
                >
                  {tz.label} <span className="text-muted-foreground">({tz.abbreviation})</span>
                </li>
              ))}
              <li className="px-2 py-1 text-xs font-medium text-muted-foreground mt-2">All Timezones</li>
              {otherFiltered.map((tz, index) => (
                <li
                  key={tz.value}
                  role="option"
                  aria-selected={tz.value === value}
                  onClick={() => handleSelect(tz)}
                  className={cn(
                    'cursor-pointer rounded px-3 py-2 text-sm',
                    index + popularFiltered.length === highlightedIndex && 'bg-accent text-accent-foreground',
                    tz.value === value && 'font-medium'
                  )}
                >
                  {tz.label} <span className="text-muted-foreground">({tz.abbreviation})</span>
                </li>
              ))}
            </>
          ) : (
            filteredTimezones.map((tz, index) => (
              <li
                key={tz.value}
                role="option"
                aria-selected={tz.value === value}
                onClick={() => handleSelect(tz)}
                className={cn(
                  'cursor-pointer rounded px-3 py-2 text-sm',
                  index === highlightedIndex && 'bg-accent text-accent-foreground',
                  tz.value === value && 'font-medium'
                )}
              >
                {tz.label} <span className="text-muted-foreground">({tz.abbreviation})</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DatesStep({ state, dispatch }: DatesStepProps) {
  const { dates } = state;
  const [dateError, setDateError] = useState<string | null>(null);

  // Get sorted timezones
  const timezones = useMemo(() => sortTimezones(getAllTimezones()), []);

  // Set default timezone on mount if not set
  useEffect(() => {
    if (!dates.timezone) {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      dispatch({ type: 'UPDATE_DATES', payload: { timezone: browserTimezone } });
    }
  }, [dates.timezone, dispatch]);

  // Validate end date >= start date
  useEffect(() => {
    if (dates.startDate && dates.endDate) {
      const start = new Date(dates.startDate);
      const end = new Date(dates.endDate);
      if (end < start) {
        setDateError('End date must be on or after start date');
      } else {
        setDateError(null);
      }
    } else {
      setDateError(null);
    }
  }, [dates.startDate, dates.endDate]);

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStartDate = e.target.value;
      dispatch({ type: 'UPDATE_DATES', payload: { startDate: newStartDate } });

      // Auto-adjust end date if it's before the new start date
      if (dates.endDate && newStartDate) {
        const start = new Date(newStartDate);
        const end = new Date(dates.endDate);
        if (end < start) {
          dispatch({ type: 'UPDATE_DATES', payload: { endDate: newStartDate } });
        }
      }
    },
    [dates.endDate, dispatch]
  );

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: 'UPDATE_DATES', payload: { endDate: e.target.value } });
    },
    [dispatch]
  );

  const handleTimezoneChange = useCallback(
    (value: string) => {
      dispatch({ type: 'UPDATE_DATES', payload: { timezone: value } });
    },
    [dispatch]
  );

  const handleLocationTypeChange = useCallback(
    (value: LocationType) => {
      dispatch({ type: 'UPDATE_DATES', payload: { locationType: value } });
      // Clear location fields when switching to virtual
      if (value === 'virtual') {
        dispatch({ type: 'UPDATE_DATES', payload: { locationName: '', locationAddress: '' } });
      }
    },
    [dispatch]
  );

  const handleLocationNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: 'UPDATE_DATES', payload: { locationName: e.target.value } });
    },
    [dispatch]
  );

  const handleLocationAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: 'UPDATE_DATES', payload: { locationAddress: e.target.value } });
    },
    [dispatch]
  );

  const showLocationFields = dates.locationType === 'in-person' || dates.locationType === 'hybrid';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Event Dates & Location</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set the dates, timezone, and location details for your event.
        </p>
      </div>

      {/* Date Pickers */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Event Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={dates.startDate}
              onChange={handleStartDateChange}
              className="w-full"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="endDate">Event End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={dates.endDate}
              onChange={handleEndDateChange}
              min={dates.startDate || undefined}
              error={!!dateError}
              className="w-full"
            />
            {dateError && <p className="text-sm text-destructive">{dateError}</p>}
          </div>
        </div>
      </div>

      {/* Timezone Picker */}
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <TimezoneSelect value={dates.timezone} onChange={handleTimezoneChange} timezones={timezones} />
        <p className="text-sm text-muted-foreground">
          All event times will be displayed in this timezone.
        </p>
      </div>

      {/* Location Type */}
      <div className="space-y-3">
        <Label>Location Type</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {LOCATION_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer flex-col rounded-lg border p-4 transition-colors',
                dates.locationType === option.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-input hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="locationType"
                  value={option.value}
                  checked={dates.locationType === option.value}
                  onChange={() => handleLocationTypeChange(option.value)}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span className="font-medium">{option.label}</span>
              </div>
              <p className="mt-1 pl-7 text-sm text-muted-foreground">{option.description}</p>
            </label>
          ))}
        </div>
      </div>

      {/* Location Fields (conditional) */}
      {showLocationFields && (
        <div className="space-y-4 rounded-lg border border-dashed p-4">
          <div className="space-y-2">
            <Label htmlFor="locationName">Location Name</Label>
            <Input
              id="locationName"
              type="text"
              placeholder="e.g., University of Colorado Boulder"
              value={dates.locationName}
              onChange={handleLocationNameChange}
            />
            <p className="text-sm text-muted-foreground">The name of the venue or building.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationAddress">Location Address</Label>
            <Input
              id="locationAddress"
              type="text"
              placeholder="e.g., 1234 Main St, Boulder, CO 80302"
              value={dates.locationAddress}
              onChange={handleLocationAddressChange}
            />
            <p className="text-sm text-muted-foreground">Full address for attendees to find the venue.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatesStep;
