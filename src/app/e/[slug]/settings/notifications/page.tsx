'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Bell, Smartphone, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useEvent, useEventRole } from '@/contexts/EventContext'
import {
  useNotificationPreferences,
  categoryInfo,
  type NotificationCategory,
} from '@/hooks/useNotificationPreferences'
import { cn } from '@/lib/utils'

// Toggle switch component
function Toggle({
  enabled,
  onChange,
  disabled,
  saving,
}: {
  enabled: boolean
  onChange: () => void
  disabled?: boolean
  saving?: boolean
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled || saving}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        enabled ? 'bg-primary' : 'bg-muted',
        (disabled || saving) && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
      {saving && (
        <Loader2 className="absolute right-1 h-3 w-3 animate-spin text-white" />
      )}
    </button>
  )
}

// Row for a single notification category
function PreferenceRow({
  category,
  isAdmin,
}: {
  category: NotificationCategory
  isAdmin: boolean
}) {
  const event = useEvent()
  const { getPreference, toggleChannel, isSaving } = useNotificationPreferences({ eventId: event.id })

  const pref = getPreference(category)
  const info = categoryInfo[category]

  // Hide admin_alerts for non-admins
  if (category === 'admin_alerts' && !isAdmin) {
    return null
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
      <div className="flex-1 mr-4">
        <h4 className="font-medium text-sm">{info.label}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
      </div>

      <div className="flex items-center gap-6">
        {/* Email */}
        <div className="flex flex-col items-center gap-1">
          <Toggle
            enabled={pref.email_enabled}
            onChange={() => toggleChannel(category, 'email_enabled')}
            saving={isSaving}
          />
        </div>

        {/* In-app */}
        <div className="flex flex-col items-center gap-1">
          <Toggle
            enabled={pref.in_app_enabled}
            onChange={() => toggleChannel(category, 'in_app_enabled')}
            saving={isSaving}
          />
        </div>

        {/* Push (disabled for now) */}
        <div className="flex flex-col items-center gap-1">
          <Toggle
            enabled={pref.push_enabled}
            onChange={() => toggleChannel(category, 'push_enabled')}
            disabled={true}
            saving={isSaving}
          />
        </div>
      </div>
    </div>
  )
}

export default function NotificationSettingsPage() {
  const event = useEvent()
  const { isAdmin } = useEventRole()
  const { isLoading } = useNotificationPreferences({ eventId: event.id })

  const categories: NotificationCategory[] = [
    'session_updates',
    'voting_updates',
    'collaboration',
    'event_announcements',
    'admin_alerts',
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/e/${event.slug}/dashboard`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Notification Settings</h1>
            <p className="text-sm text-muted-foreground">
              Control how you receive notifications for {event.name}
            </p>
          </div>
        </div>

        {/* Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose which notifications you want to receive and how
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="flex items-center justify-between pb-4 mb-2 border-b border-border">
                  <div className="flex-1" />
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center w-11">
                      <Mail className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Email</span>
                    </div>
                    <div className="flex flex-col items-center w-11">
                      <Bell className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">In-app</span>
                    </div>
                    <div className="flex flex-col items-center w-11">
                      <Smartphone className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Push</span>
                    </div>
                  </div>
                </div>

                {/* Preference rows */}
                {categories.map((category) => (
                  <PreferenceRow
                    key={category}
                    category={category}
                    isAdmin={isAdmin}
                  />
                ))}

                {/* Push notification note */}
                <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                  Push notifications are coming soon. Enable them now to be ready when they launch.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
