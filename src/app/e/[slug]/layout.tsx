import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events';
import { EventProvider } from '@/contexts/EventContext';

interface EventLayoutProps {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function EventLayout({ params, children }: EventLayoutProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return <EventProvider event={event}>{children}</EventProvider>;
}

// Generate metadata for the event
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return {
      title: 'Event Not Found',
    };
  }

  return {
    title: `${event.name} | Schelling Point`,
    description: event.description || event.tagline || `${event.name} unconference`,
    openGraph: {
      title: event.name,
      description: event.description || event.tagline || undefined,
      images: event.bannerUrl ? [event.bannerUrl] : undefined,
    },
  };
}
