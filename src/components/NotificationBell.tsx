'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, ExternalLink, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useNotifications, type Notification } from '@/hooks/useNotifications'
import { useEvent } from '@/contexts/EventContext'
import { formatDistanceToNow } from 'date-fns'

// Map notification types to icons/colors
const notificationStyles: Record<string, { color: string; icon?: string }> = {
  session_approved: { color: 'bg-green-500' },
  session_rejected: { color: 'bg-red-500' },
  session_scheduled: { color: 'bg-blue-500' },
  session_rescheduled: { color: 'bg-yellow-500' },
  vote_milestone: { color: 'bg-purple-500' },
  cohost_invited: { color: 'bg-indigo-500' },
  cohost_accepted: { color: 'bg-green-500' },
  cohost_declined: { color: 'bg-orange-500' },
  new_proposal: { color: 'bg-cyan-500' },
  admin_announcement: { color: 'bg-primary' },
  default: { color: 'bg-muted-foreground' },
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onClick?: () => void
}) {
  const router = useRouter()
  const isUnread = !notification.read_at
  const style = notificationStyles[notification.type] || notificationStyles.default

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id)
    }
    if (notification.action_url) {
      router.push(notification.action_url)
    }
    onClick?.()
  }

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0',
        isUnread && 'bg-muted/30'
      )}
    >
      <div className="flex gap-3">
        {/* Indicator dot */}
        <div className="flex-shrink-0 mt-1.5">
          <div className={cn('w-2 h-2 rounded-full', style.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm', isUnread ? 'font-medium' : 'text-muted-foreground')}>
            {notification.title}
          </p>
          {notification.body && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.body}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo}</p>
        </div>

        {/* Unread indicator */}
        {isUnread && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        )}
      </div>
    </button>
  )
}

function NotificationSkeleton() {
  return (
    <div className="p-3 border-b border-border">
      <div className="flex gap-3">
        <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  )
}

export function NotificationBell() {
  const event = useEvent()
  const [isOpen, setIsOpen] = React.useState(false)

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications({ eventId: event.id, limit: 10 })

  // Refresh when popover opens
  React.useEffect(() => {
    if (isOpen) {
      refresh()
    }
  }, [isOpen, refresh])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <>
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
            </>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onClick={() => setIsOpen(false)}
              />
            ))
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t border-border flex gap-2">
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              asChild
              onClick={() => setIsOpen(false)}
            >
              <Link href={`/e/${event.slug}/notifications`}>
                View all
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn("text-xs", notifications.length === 0 && "w-full")}
            asChild
            onClick={() => setIsOpen(false)}
          >
            <Link href={`/e/${event.slug}/settings/notifications`}>
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
