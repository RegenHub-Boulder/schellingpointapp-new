'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface FooterProps {
  className?: string
  variant?: 'default' | 'minimal'
}

export function Footer({ className, variant = 'default' }: FooterProps) {
  const isMinimal = variant === 'minimal'

  if (isMinimal) {
    return (
      <footer className={cn('bg-background border-t border-border/50', className)}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Logo */}
            <a
              href="https://ethboulder.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo.svg"
                alt="EthBoulder"
                width={28}
                height={28}
                className="rounded"
              />
              <span className="font-display font-bold text-sm">EthBoulder</span>
            </a>

            {/* Social + Links */}
            <div className="flex items-center gap-4">
              {/* Social Icons */}
              <div className="flex items-center gap-2">
                <a
                  href="https://t.me/+hDrF89xECLsxNjFh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Telegram"
                >
                  <Send className="h-4 w-4" />
                </a>
                <a
                  href="https://x.com/ethboulder"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full text-muted-foreground hover:text-primary transition-colors"
                  aria-label="X (Twitter)"
                >
                  <XIcon className="h-4 w-4" />
                </a>
              </div>

              <span className="text-border">|</span>

              {/* Text Links */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <Link href="/privacy" className="hover:text-primary transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-primary transition-colors">
                  Terms
                </Link>
                <span className="hidden sm:inline">
                  Powered by{' '}
                  <a
                    href="https://regenhub.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    RegenHub
                  </a>
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
            background: 'radial-gradient(ellipse 100% 80% at 50% 120%, hsl(82 85% 55% / 0.15), transparent 60%)',
          }}
        />

        <a
          href="https://ethboulder.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="relative block group cursor-pointer"
        >
          {/* Hover glow effect */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-all duration-700 ease-out group-hover:opacity-100"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 80%, hsl(82 85% 55% / 0.4), transparent 50%)',
              filter: 'blur(60px)',
            }}
          />

          {/* Content wrapper */}
          <div className="relative py-16 sm:py-24 lg:py-32">
            {/* Logo - Large and centered */}
            <div className="flex justify-center mb-8 sm:mb-10">
              <div className="relative">
                <Image
                  src="/logo.svg"
                  alt="EthBoulder"
                  width={120}
                  height={120}
                  className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-2xl transition-all duration-500"
                  style={{
                    filter: 'drop-shadow(0 0 30px hsl(82 85% 55% / 0.4))',
                  }}
                />
                {/* Logo glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    boxShadow: '0 0 80px 30px hsl(82 85% 55% / 0.5)',
                  }}
                />
              </div>
            </div>

            {/* Giant Wordmark */}
            <h2 className="text-center px-4">
              <span
                className="block text-[20vw] sm:text-[18vw] md:text-[15vw] lg:text-[12vw] font-display leading-[0.8] tracking-tighter transition-all duration-500 select-none"
                style={{
                  color: 'transparent',
                  WebkitTextStroke: '2px hsl(215 20% 35%)',
                  textShadow: 'none',
                }}
              >
                <span
                  className="inline-block transition-all duration-500 group-hover:scale-105"
                  style={{
                    WebkitTextStroke: '2px hsl(215 20% 35%)',
                  }}
                >
                  <span className="font-extrabold group-hover:[color:hsl(82_85%_55%)] group-hover:[-webkit-text-stroke:2px_hsl(82_85%_55%)] transition-all duration-500">Eth</span>
                  <span className="font-light group-hover:[color:hsl(82_85%_55%/0.7)] group-hover:[-webkit-text-stroke:1px_hsl(82_85%_55%/0.7)] transition-all duration-500">Boulder</span>
                </span>
              </span>
            </h2>

            {/* Tagline */}
            <p className="text-center text-sm sm:text-base text-muted-foreground/60 mt-6 sm:mt-8 transition-colors duration-500 group-hover:text-muted-foreground">
              Fork The Frontier
            </p>
          </div>
        </a>
      </div>

      {/* Links Section */}
      <div className="relative border-t border-border/30 bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          {/* Social Icons */}
          <div className="flex justify-center items-center gap-4 sm:gap-6 mb-6">
            <a
              href="https://t.me/+hDrF89xECLsxNjFh"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 sm:p-3 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
              aria-label="Telegram"
            >
              <Send className="h-5 w-5" />
            </a>
            <a
              href="https://x.com/ethboulder"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 sm:p-3 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
              aria-label="X (Twitter)"
            >
              <XIcon className="h-5 w-5" />
            </a>
          </div>

          {/* Credits and links row */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
            <span>© 2026 EthBoulder</span>
            <span className="hidden sm:inline text-border">•</span>
            <span>
              Powered by{' '}
              <a
                href="https://regenhub.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                RegenHub.xyz
              </a>
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <div className="flex items-center gap-4">
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
