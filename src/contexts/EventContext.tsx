'use client';

import * as React from 'react';
import type { Event, EventRoleName } from '@/types/event';
import { canRolePerform, isAdminRole, type Permission } from '@/lib/permissions';
import { hexToHslValues, isValidHexColor, getContrastingForeground } from '@/lib/utils/color';
import { createClient } from '@/lib/supabase/client';

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

interface EventProviderProps {
  event: Event;
  children: React.ReactNode;
}

export function EventProvider({ event, children }: EventProviderProps) {
  const [role, setRole] = React.useState<EventRoleName | null>(null);
  const [voteCredits, setVoteCredits] = React.useState<number>(event.voteCreditsPerUser);
  const [isLoading, setIsLoading] = React.useState(true);
  const supabase = createClient();

  // Fetch user's role for this event, auto-join public events
  React.useEffect(() => {
    const fetchMembership = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const user = session.user;

        // Get membership
        const { data: memberData, error: memberError } = await supabase
          .from('event_members')
          .select('*')
          .eq('event_id', event.id)
          .eq('user_id', user.id);

        if (!memberError && memberData && memberData.length > 0) {
          // User is already a member
          setRole(memberData[0].role as EventRoleName);
          setVoteCredits(memberData[0].vote_credits ?? event.voteCreditsPerUser);
        } else if (event.visibility === 'public') {
          // Auto-join public events as attendee
          const { data: joinData, error: joinError } = await supabase
            .from('event_members')
            .insert({
              event_id: event.id,
              user_id: user.id,
              role: 'attendee',
            })
            .select();

          if (!joinError && joinData && joinData.length > 0) {
            setRole('attendee');
            setVoteCredits(joinData[0].vote_credits ?? event.voteCreditsPerUser);
          }
        }
      } catch (err) {
        console.error('Error fetching event membership:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembership();
  }, [event.id, event.voteCreditsPerUser, event.visibility, supabase]);

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
