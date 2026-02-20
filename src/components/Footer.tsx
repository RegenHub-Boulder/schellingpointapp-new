'use client'

import * as React from 'react'
import Link from 'next/link'
import { Send, Globe, Twitter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Event } from '@/types/event'

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

// Discord icon component
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

// ============================================================================
// Types
// ============================================================================

interface SocialLinks {
  twitter?: string
  telegram?: string
  discord?: string
  website?: string
}

interface FooterBranding {
  name: string
  logoUrl?: string | null
  tagline?: string | null
  social?: SocialLinks
}

interface FooterProps {
  className?: string
  variant?: 'default' | 'minimal'
  // Event branding - if provided, shows event-specific footer
  event?: Pick<Event, 'name' | 'logoUrl' | 'tagline' | 'theme'> | null
}

// ============================================================================
// Platform branding (Schelling Point)
// ============================================================================

const PLATFORM_BRANDING: FooterBranding = {
  name: 'Schelling Point',
  tagline: 'Where ideas converge',
  social: {
    twitter: 'https://twitter.com/schellingpoint',
    // Add more as the platform grows
  },
}

// ============================================================================
// Social Links Component
// ============================================================================

function SocialLinks({
  social,
  size = 'default',
}: {
  social?: SocialLinks
  size?: 'default' | 'small'
}) {
  if (!social) return null

  const iconClass = size === 'small' ? 'h-4 w-4' : 'h-5 w-5'
  const buttonClass = size === 'small'
    ? 'p-1.5 rounded-full text-muted-foreground hover:text-primary transition-colors'
    : 'p-2.5 sm:p-3 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300'

  const links = [
    { href: social.telegram, icon: <Send className={iconClass} />, label: 'Telegram' },
    { href: social.twitter, icon: <XIcon className={iconClass} />, label: 'X (Twitter)' },
    { href: social.discord, icon: <DiscordIcon className={iconClass} />, label: 'Discord' },
    { href: social.website, icon: <Globe className={iconClass} />, label: 'Website' },
  ].filter((link) => link.href)

  if (links.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {links.map(({ href, icon, label }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          aria-label={label}
        >
          {icon}
        </a>
      ))}
    </div>
  )
}

// ============================================================================
// Main Footer Component
// ============================================================================

export function Footer({ className, variant = 'default', event }: FooterProps) {
  const isMinimal = variant === 'minimal'

  // Get branding from event or fallback to platform
  const branding: FooterBranding = event
    ? {
        name: event.name,
        logoUrl: event.logoUrl,
        tagline: event.tagline,
        social: event.theme?.social,
      }
    : PLATFORM_BRANDING

  if (isMinimal) {
    return (
      <footer className={cn('bg-background border-t border-border/50', className)}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Logo/Name */}
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.name}
                  className="w-7 h-7 rounded object-contain"
                />
              ) : (
                <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {branding.name.charAt(0)}
                </div>
              )}
              <span className="font-display font-bold text-sm">{branding.name}</span>
            </Link>

            {/* Social + Links */}
            <div className="flex items-center gap-4">
              <SocialLinks social={branding.social} size="small" />

              <span className="text-border">|</span>

              {/* Text Links */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <Link href="/codeofconduct" className="hover:text-primary transition-colors">
                  Code of Conduct
                </Link>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  Terms
                </Link>
                <span className="hidden sm:inline">
                  Powered by{' '}
                  <Link href="/" className="hover:text-primary transition-colors">
                    Schelling Point
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className={cn('relative bg-background overflow-hidden', className)}>
      {/* Hero Section - Logo + Giant Wordmark */}
      <div className="relative border-t border-border/30">
        {/* Animated background glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background: 'radial-gradient(ellipse 100% 80% at 50% 120%, hsl(var(--primary) / 0.15), transparent 60%)',
          }}
        />

        <Link href="/" className="relative block group cursor-pointer">
          {/* Hover glow effect */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-all duration-700 ease-out group-hover:opacity-100"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 80%, hsl(var(--primary) / 0.4), transparent 50%)',
              filter: 'blur(60px)',
            }}
          />

          {/* Content wrapper */}
          <div className="relative py-16 sm:py-24 lg:py-32">
            {/* Logo - Large and centered */}
            <div className="flex justify-center mb-8 sm:mb-10">
              <div className="relative">
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.name}
                    className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-2xl object-contain transition-all duration-500"
                    style={{
                      filter: 'drop-shadow(0 0 30px hsl(var(--primary) / 0.4))',
                    }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-4xl sm:text-5xl lg:text-6xl transition-all duration-500"
                    style={{
                      filter: 'drop-shadow(0 0 30px hsl(var(--primary) / 0.4))',
                    }}
                  >
                    {branding.name.charAt(0)}
                  </div>
                )}
                {/* Logo glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    boxShadow: '0 0 80px 30px hsl(var(--primary) / 0.5)',
                  }}
                />
              </div>
            </div>

            {/* Giant Wordmark */}
            <h2 className="text-center px-4">
              <span
                className="block text-[15vw] sm:text-[12vw] md:text-[10vw] lg:text-[8vw] font-display leading-[0.85] tracking-tight transition-all duration-500 select-none"
                style={{
                  color: 'transparent',
                  WebkitTextStroke: '2px hsl(var(--muted-foreground) / 0.3)',
                }}
              >
                <span
                  className="inline-block transition-all duration-500 group-hover:scale-105 font-bold group-hover:[color:hsl(var(--primary))] group-hover:[-webkit-text-stroke:2px_hsl(var(--primary))]"
                >
                  {branding.name}
                </span>
              </span>
            </h2>

            {/* Tagline */}
            {branding.tagline && (
              <p className="text-center text-sm sm:text-base text-muted-foreground/60 mt-6 sm:mt-8 transition-colors duration-500 group-hover:text-muted-foreground">
                {branding.tagline}
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Links Section */}
      <div className="relative border-t border-border/30 bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          {/* Social Icons */}
          <div className="flex justify-center items-center gap-4 sm:gap-6 mb-6">
            <SocialLinks social={branding.social} />
          </div>

          {/* Credits and links row */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} {branding.name}</span>
            <span className="hidden sm:inline text-border">•</span>
            <span>
              Powered by{' '}
              <Link href="/" className="hover:text-primary transition-colors">
                Schelling Point
              </Link>
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <div className="flex items-center gap-4">
              <Link href="/codeofconduct" className="hover:text-primary transition-colors">
                Code of Conduct
              </Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
