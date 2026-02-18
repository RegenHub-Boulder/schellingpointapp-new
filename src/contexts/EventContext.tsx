'use client';

import * as React from 'react';
import type { Event, EventRoleName } from '@/types/event';
import { canRolePerform, isAdminRole, type Permission } from '@/lib/permissions';

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

  // Fetch user's role for this event
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
            setRole(data[0].role as EventRoleName);
            setVoteCredits(data[0].vote_credits ?? event.voteCreditsPerUser);
          }
        }
      } catch (err) {
        console.error('Error fetching event membership:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembership();
  }, [event.id, event.voteCreditsPerUser]);

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
