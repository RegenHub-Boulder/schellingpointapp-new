'use client';

import * as React from 'react';
import type { Event, EventRoleName } from '@/types/event';
import { canRolePerform, isAdminRole, type Permission } from '@/lib/permissions';
import { hexToHslValues, isValidHexColor, getContrastingForeground } from '@/lib/utils/color';

// Event context value
interface EventContextValue {
  event: Event;
}

// Event role context value
interface EventRoleContextValue {
  role: EventRoleName | null;
  voteCredits: number;
  isLoading: boolean;
  can: (permission: Permission) => boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isMember: boolean;
}

const EventContext = React.createContext<EventContextValue | null>(null);
const EventRoleContext = React.createContext<EventRoleContextValue | null>(null);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      const session = JSON.parse(stored);
      return session?.access_token || null;
    } catch {
      return null;
    }
  }
  return null;
}

interface EventProviderProps {
  event: Event;
  children: React.ReactNode;
}

export function EventProvider({ event, children }: EventProviderProps) {
  const [role, setRole] = React.useState<EventRoleName | null>(null);
  const [voteCredits, setVoteCredits] = React.useState<number>(event.voteCreditsPerUser);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch user's role for this event, auto-join public events
  React.useEffect(() => {
    const fetchMembership = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Get current user
        const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          setIsLoading(false);
          return;
        }

        const userData = await userResponse.json();

        // Get membership
        const memberResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/event_members?event_id=eq.${event.id}&user_id=eq.${userData.id}&select=*`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (memberResponse.ok) {
          const data = await memberResponse.json();
          if (data && data.length > 0) {
            // User is already a member
            setRole(data[0].role as EventRoleName);
            setVoteCredits(data[0].vote_credits ?? event.voteCreditsPerUser);
          } else if (event.visibility === 'public') {
            // Auto-join public events as attendee
            const joinResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/event_members`,
              {
                method: 'POST',
                headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  Prefer: 'return=representation',
                },
                body: JSON.stringify({
                  event_id: event.id,
                  user_id: userData.id,
                  role: 'attendee',
                }),
              }
            );

            if (joinResponse.ok) {
              const joinData = await joinResponse.json();
              if (joinData && joinData.length > 0) {
                setRole('attendee');
                setVoteCredits(joinData[0].vote_credits ?? event.voteCreditsPerUser);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching event membership:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembership();
  }, [event.id, event.voteCreditsPerUser, event.visibility]);

  // Apply event theme colors as CSS custom properties
  React.useEffect(() => {
    const root = document.documentElement;
    const theme = event.theme;
    const appliedProperties: string[] = [];

    // Apply primary color
    if (theme?.colors?.primary && isValidHexColor(theme.colors.primary)) {
      const primaryHsl = hexToHslValues(theme.colors.primary);
      root.style.setProperty('--primary', primaryHsl);
      appliedProperties.push('--primary');

      // Auto-calculate primary foreground for contrast
      const primaryForeground = getContrastingForeground(theme.colors.primary);
      root.style.setProperty('--primary-foreground', primaryForeground);
      appliedProperties.push('--primary-foreground');
    }

    // Apply secondary color
    if (theme?.colors?.secondary && isValidHexColor(theme.colors.secondary)) {
      const secondaryHsl = hexToHslValues(theme.colors.secondary);
      root.style.setProperty('--secondary', secondaryHsl);
      appliedProperties.push('--secondary');

      const secondaryForeground = getContrastingForeground(theme.colors.secondary);
      root.style.setProperty('--secondary-foreground', secondaryForeground);
      appliedProperties.push('--secondary-foreground');
    }

    // Apply accent color
    if (theme?.colors?.accent && isValidHexColor(theme.colors.accent)) {
      const accentHsl = hexToHslValues(theme.colors.accent);
      root.style.setProperty('--accent', accentHsl);
      appliedProperties.push('--accent');

      const accentForeground = getContrastingForeground(theme.colors.accent);
      root.style.setProperty('--accent-foreground', accentForeground);
      appliedProperties.push('--accent-foreground');
    }

    // Cleanup: remove applied properties when leaving event pages
    return () => {
      appliedProperties.forEach((prop) => {
        root.style.removeProperty(prop);
      });
    };
  }, [event.theme]);

  const roleValue = React.useMemo<EventRoleContextValue>(
    () => ({
      role,
      voteCredits,
      isLoading,
      can: (permission: Permission) => (role ? canRolePerform(role, permission) : false),
      isAdmin: role ? isAdminRole(role) : false,
      isOwner: role === 'owner',
      isMember: role !== null,
    }),
    [role, voteCredits, isLoading]
  );

  return (
    <EventContext.Provider value={{ event }}>
      <EventRoleContext.Provider value={roleValue}>{children}</EventRoleContext.Provider>
    </EventContext.Provider>
  );
}

/**
 * Hook to access current event
 */
export function useEvent(): Event {
  const context = React.useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within EventProvider');
  }
  return context.event;
}

/**
 * Hook to access user's role in current event
 */
export function useEventRole(): EventRoleContextValue {
  const context = React.useContext(EventRoleContext);
  if (!context) {
    throw new Error('useEventRole must be used within EventProvider');
  }
  return context;
}
