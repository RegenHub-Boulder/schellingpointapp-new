'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  FileText,
  LayoutGrid,
  Settings,
  ArrowLeft,
  Megaphone,
  BarChart3,
  Tags,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminNavProps {
  eventSlug: string
  canManageSchedule: boolean
  canManageVenues: boolean
}

export function AdminNav({ eventSlug, canManageSchedule, canManageVenues }: AdminNavProps) {
  const pathname = usePathname()

  const baseUrl = `/e/${eventSlug}/admin`
  const isMainAdmin = pathname === baseUrl
  const isScheduleBuilder = pathname === `${baseUrl}/schedule`
  const isSetup = pathname === `${baseUrl}/setup`
  const isCommunications = pathname === `${baseUrl}/communications`
  const isAnalytics = pathname === `${baseUrl}/analytics`
  const isTracks = pathname === `${baseUrl}/tracks`

  const navItems = [
    {
      label: 'Sessions',
      href: baseUrl,
      icon: <FileText className="h-4 w-4" />,
      active: isMainAdmin,
      show: true,
    },
    {
      label: 'Schedule Builder',
      href: `${baseUrl}/schedule`,
      icon: <LayoutGrid className="h-4 w-4" />,
      active: isScheduleBuilder,
      show: canManageSchedule,
    },
    {
      label: 'Event Setup',
      href: `${baseUrl}/setup`,
      icon: <Settings className="h-4 w-4" />,
      active: isSetup,
      show: canManageVenues,
    },
    {
      label: 'Tracks',
      href: `${baseUrl}/tracks`,
      icon: <Tags className="h-4 w-4" />,
      active: isTracks,
      show: true, // All admins can manage tracks
    },
    {
      label: 'Communications',
      href: `${baseUrl}/communications`,
      icon: <Megaphone className="h-4 w-4" />,
      active: isCommunications,
      show: true, // All admins can send communications
    },
    {
      label: 'Analytics',
      href: `${baseUrl}/analytics`,
      icon: <BarChart3 className="h-4 w-4" />,
      active: isAnalytics,
      show: true, // All admins can view analytics
    },
  ].filter(item => item.show)

  return (
    <header className="border-b sticky top-0 bg-background z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Back link and title */}
          <div className="flex items-center gap-3">
            <Link
              href={`/e/${eventSlug}/sessions`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Back to Schedule</span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <h1 className="font-bold text-lg hidden sm:block">Admin</h1>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={item.active ? 'default' : 'ghost'}
                size="sm"
                asChild
                className={cn(
                  'whitespace-nowrap',
                  item.active && 'pointer-events-none'
                )}
              >
                <Link href={item.href}>
                  {item.icon}
                  <span className="ml-1.5 hidden sm:inline">{item.label}</span>
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
