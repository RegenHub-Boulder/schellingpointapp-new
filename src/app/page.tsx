import Link from 'next/link';
import { Calendar, MapPin, Users, ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/Footer';
import { SiteHeader } from '@/components/SiteHeader';
import { createClient } from '@/lib/supabase/server';
import type { EventRow } from '@/types/event';
import { MyEventsSection } from './MyEventsSection';

// Status badge configuration
const statusBadgeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Open', variant: 'default' },
  proposals_open: { label: 'Proposals Open', variant: 'success' },
  voting_open: { label: 'Voting Open', variant: 'success' },
  scheduling: { label: 'Scheduling', variant: 'secondary' },
  live: { label: 'Live Now', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'secondary' },
  archived: { label: 'Archived', variant: 'outline' },
};

// Format date for display
function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format date range
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

// Event card component
function EventCard({ event, featured = false }: { event: EventRow & { attendee_count?: number }; featured?: boolean }) {
  const badge = statusBadgeConfig[event.status] || statusBadgeConfig.draft;

  return (
    <Link href={`/e/${event.slug}`} className="block group">
      <Card className={`overflow-hidden card-hover border-border/50 hover:border-primary/30 h-full ${featured ? 'min-w-[320px] sm:min-w-[360px]' : ''}`}>
        {/* Banner/Gradient Header */}
        <div
          className="h-24 sm:h-32 relative overflow-hidden"
          style={{
            background: event.banner_url
              ? `url(${event.banner_url}) center/cover`
              : 'linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--muted)) 100%)',
          }}
        >
          {event.logo_url && (
            <div className="absolute bottom-0 left-4 translate-y-1/2">
              <img
                src={event.logo_url}
                alt={event.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-background shadow-lg bg-background"
              />
            </div>
          )}
          <Badge variant={badge.variant} className="absolute top-3 right-3">
            {badge.label}
          </Badge>
        </div>

        <CardContent className={`pt-${event.logo_url ? '8' : '4'} pb-4 px-4`}>
          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors mb-1">
            {event.name}
            <ChevronRight className="inline h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>

          {event.tagline && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {event.tagline}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formatDateRange(event.start_date, event.end_date)}</span>
            </div>
            {event.location_name && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{event.location_name}</span>
              </div>
            )}
            {typeof event.attendee_count === 'number' && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{event.attendee_count} attendees</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 animated-gradient" />

      {/* Gradient blobs */}
      <div
        className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-gradient-drift"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl animate-gradient-drift-reverse"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
      />

      <div className="relative container mx-auto px-4 py-20 sm:py-28 lg:py-36">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="h-3 w-3 mr-1" />
            Participant-driven events
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Power your unconference with{' '}
            <span className="text-primary neon-text">Schelling Point</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The platform for participant-driven events with quadratic voting.
            Let your community shape the agenda.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="btn-primary-glow">
              <Link href="/create">
                Create Your Event
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#upcoming">
                Browse Events
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Featured Events Carousel
function FeaturedEventsCarousel({ events }: { events: (EventRow & { attendee_count?: number })[] }) {
  if (events.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Featured Events</h2>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} featured />
          ))}
        </div>
      </div>
    </section>
  );
}

// Upcoming Events Grid
function UpcomingEventsGrid({ events, showViewAll }: { events: (EventRow & { attendee_count?: number })[]; showViewAll: boolean }) {
  return (
    <section id="upcoming" className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Upcoming Events</h2>
          {showViewAll && (
            <Button asChild variant="ghost">
              <Link href="/events">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No upcoming events yet.</p>
            <Button asChild>
              <Link href="/create">
                Be the first to create one
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </section>
  );
}

// Create Event CTA
function CreateEventCTA() {
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <Card className="relative overflow-hidden border-primary/20">
          {/* Background gradient */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 100%, hsl(var(--primary)) 0%, transparent 70%)',
            }}
          />

          <CardContent className="relative py-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Ready to host your own event?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Create an unconference, hackathon, or community gathering with
              democratic session selection powered by quadratic voting.
            </p>
            <Button asChild size="lg" className="btn-primary-glow">
              <Link href="/create">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// Server component to fetch events
async function fetchEvents() {
  const supabase = await createClient();

  // Fetch public events that are not drafts or archived
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('visibility', 'public')
    .not('status', 'in', '("draft","archived")')
    .order('start_date', { ascending: true });

  if (error || !events) {
    console.error('Error fetching events:', error);
    return { featuredEvents: [], upcomingEvents: [], allEvents: [] };
  }

  // Get attendee counts for each event
  const eventIds = events.map(e => e.id);
  const { data: memberCounts } = await supabase
    .from('event_members')
    .select('event_id')
    .in('event_id', eventIds);

  // Count attendees per event
  const attendeeCounts: Record<string, number> = {};
  if (memberCounts) {
    memberCounts.forEach(m => {
      attendeeCounts[m.event_id] = (attendeeCounts[m.event_id] || 0) + 1;
    });
  }

  // Add attendee counts to events
  const eventsWithCounts = events.map(e => ({
    ...e,
    attendee_count: attendeeCounts[e.id] || 0,
  }));

  const now = new Date();
  const featuredEvents = eventsWithCounts.filter(e => e.is_featured);
  const upcomingEvents = eventsWithCounts.filter(e => new Date(e.start_date) >= now);

  return { featuredEvents, upcomingEvents, allEvents: eventsWithCounts };
}

/**
 * Platform Landing Page
 *
 * Event discovery hub showing:
 * - Hero section with CTA
 * - Featured events carousel
 * - Upcoming events grid
 * - Create event CTA
 * - My Events section (for logged-in users)
 */
export default async function HomePage() {
  const { featuredEvents, upcomingEvents } = await fetchEvents();

  // Limit upcoming events to 6 for the grid
  const displayedUpcoming = upcomingEvents.slice(0, 6);
  const hasMoreUpcoming = upcomingEvents.length > 6;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />

        {featuredEvents.length > 0 && (
          <FeaturedEventsCarousel events={featuredEvents} />
        )}

        <UpcomingEventsGrid
          events={displayedUpcoming}
          showViewAll={hasMoreUpcoming}
        />

        <CreateEventCTA />

        <MyEventsSection />
      </main>

      <Footer variant="minimal" />
    </div>
  );
}
