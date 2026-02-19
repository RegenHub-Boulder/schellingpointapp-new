'use client';

import * as React from 'react';
import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TimezonePickerProps {
  /** IANA timezone value (e.g., "America/Denver") */
  value: string;
  /** Callback when timezone changes */
  onChange: (timezone: string) => void;
  /** Optional label for the picker */
  label?: string;
  /** Placeholder text when no timezone selected */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

interface TimezoneOption {
  value: string;
  label: string;
  abbreviation: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Popular timezones to show first in the list */
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

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get the browser's default timezone
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Denver'; // Fallback
  }
}

/**
 * Get timezone abbreviation for display (e.g., "MST", "EST")
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
// Component
// ============================================================================

/**
 * A reusable timezone picker component with search, popular timezones first,
 * and full keyboard navigation.
 */
export function TimezonePicker({
  value,
  onChange,
  label,
  placeholder = 'Select timezone...',
  className,
}: TimezonePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Get sorted timezones (memoized since it's expensive)
  const timezones = useMemo(() => sortTimezones(getAllTimezones()), []);

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
    : placeholder;

  // Split into popular and other timezones for display
  const popularSet = new Set(POPULAR_TIMEZONES);
  const popularFiltered = filteredTimezones.filter((tz) => popularSet.has(tz.value));
  const otherFiltered = filteredTimezones.filter((tz) => !popularSet.has(tz.value));
  const showSections = !searchQuery.trim() && popularFiltered.length > 0 && otherFiltered.length > 0;

  // Calculate index offset for highlighting across sections
  const getAbsoluteIndex = (sectionIndex: number, isPopular: boolean): number => {
    return isPopular ? sectionIndex : popularFiltered.length + sectionIndex;
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}

      {/* Combobox Container */}
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
              aria-label="Search timezones"
              aria-expanded={isOpen}
              aria-controls="timezone-listbox"
              role="combobox"
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
              aria-haspopup="listbox"
              aria-expanded={isOpen}
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
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dropdown list */}
        {isOpen && (
          <ul
            ref={listRef}
            id="timezone-listbox"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md"
            role="listbox"
            aria-label="Timezones"
          >
            {filteredTimezones.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No timezones found</li>
            ) : showSections ? (
              <>
                <li className="px-2 py-1 text-xs font-medium text-muted-foreground" role="presentation">
                  Popular
                </li>
                {popularFiltered.map((tz, index) => {
                  const absoluteIndex = getAbsoluteIndex(index, true);
                  return (
                    <li
                      key={tz.value}
                      role="option"
                      aria-selected={tz.value === value}
                      onClick={() => handleSelect(tz)}
                      className={cn(
                        'cursor-pointer rounded px-3 py-2 text-sm',
                        absoluteIndex === highlightedIndex && 'bg-accent text-accent-foreground',
                        tz.value === value && 'font-medium'
                      )}
                    >
                      {tz.label} <span className="text-muted-foreground">({tz.abbreviation})</span>
                    </li>
                  );
                })}
                <li className="px-2 py-1 text-xs font-medium text-muted-foreground mt-2" role="presentation">
                  All Timezones
                </li>
                {otherFiltered.map((tz, index) => {
                  const absoluteIndex = getAbsoluteIndex(index, false);
                  return (
                    <li
                      key={tz.value}
                      role="option"
                      aria-selected={tz.value === value}
                      onClick={() => handleSelect(tz)}
                      className={cn(
                        'cursor-pointer rounded px-3 py-2 text-sm',
                        absoluteIndex === highlightedIndex && 'bg-accent text-accent-foreground',
                        tz.value === value && 'font-medium'
                      )}
                    >
                      {tz.label} <span className="text-muted-foreground">({tz.abbreviation})</span>
                    </li>
                  );
                })}
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
    </div>
  );
}

export default TimezonePicker;
