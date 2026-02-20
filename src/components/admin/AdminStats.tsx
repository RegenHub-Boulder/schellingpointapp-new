'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  FileText,
  CheckCircle2,
  Calendar,
  XCircle,
  MapPin,
  Clock
} from 'lucide-react'

interface AdminStatsProps {
  pending: number
  approved: number
  scheduled: number
  rejected: number
  venues: number
  timeSlots: number
}

export function AdminStats({
  pending,
  approved,
  scheduled,
  rejected,
  venues,
  timeSlots
}: AdminStatsProps) {
  const total = pending + approved + scheduled + rejected

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        label="Pending Review"
        value={pending}
        icon={<FileText className="h-4 w-4" />}
        variant={pending > 0 ? 'warning' : 'default'}
      />
      <StatCard
        label="Approved"
        value={approved}
        icon={<CheckCircle2 className="h-4 w-4" />}
        variant={approved > 0 ? 'success' : 'default'}
      />
      <StatCard
        label="Scheduled"
        value={scheduled}
        icon={<Calendar className="h-4 w-4" />}
        variant="primary"
      />
      <StatCard
        label="Rejected"
        value={rejected}
        icon={<XCircle className="h-4 w-4" />}
        variant="muted"
      />
      <StatCard
        label="Venues"
        value={venues}
        icon={<MapPin className="h-4 w-4" />}
        variant="default"
      />
      <StatCard
        label="Time Slots"
        value={timeSlots}
        icon={<Clock className="h-4 w-4" />}
        variant="default"
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  variant = 'default'
}: {
  label: string
  value: number
  icon: React.ReactNode
  variant?: 'default' | 'warning' | 'success' | 'primary' | 'muted'
}) {
  const variantStyles = {
    default: 'bg-muted/30',
    warning: 'bg-amber-500/10 border-amber-500/20',
    success: 'bg-green-500/10 border-green-500/20',
    primary: 'bg-primary/10 border-primary/20',
    muted: 'bg-muted/30 text-muted-foreground',
  }

  const iconStyles = {
    default: 'text-muted-foreground',
    warning: 'text-amber-600 dark:text-amber-400',
    success: 'text-green-600 dark:text-green-400',
    primary: 'text-primary',
    muted: 'text-muted-foreground',
  }

  return (
    <Card className={`border ${variantStyles[variant]}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <span className={iconStyles[variant]}>{icon}</span>
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}
