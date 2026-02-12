import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { InviteClient } from './InviteClient'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

async function getInviteData(token: string) {
  try {
    const admin = await createAdminClient()
    const { data: invite } = await admin
      .from('cohost_invites')
      .select(`
        id,
        status,
        expires_at,
        session:sessions(
          id,
          title,
          description,
          format,
          duration,
          host_name,
          host:profiles!host_id(id, display_name, avatar_url)
        )
      `)
      .eq('token', token)
      .single()

    if (!invite) return null

    const isExpired = new Date(invite.expires_at) < new Date()
    const effectiveStatus = invite.status === 'pending' && isExpired ? 'expired' : invite.status

    // Supabase returns nested joins with inferred array types; cast to expected shape
    return { ...invite, status: effectiveStatus } as any
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { token } = await params
  const invite = await getInviteData(token)
  const session = invite?.session as any

  if (!session) {
    return {
      title: 'Invite Not Found - Schelling Point',
    }
  }

  return {
    title: `Co-Host Invite: ${session.title} - Schelling Point`,
    description: `You've been invited to co-host "${session.title}" at EthBoulder 2026`,
  }
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const invite = await getInviteData(token)

  return <InviteClient token={token} invite={invite} />
}
