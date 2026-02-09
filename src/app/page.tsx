'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Presentation, Vote, Calendar, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Footer } from '@/components/Footer'

export default function LandingPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // Auto-redirect to dashboard if logged in
  React.useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  const handleEnter = () => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Primary neon green blob */}
        <div
          className="absolute w-[900px] h-[900px] rounded-full blur-[120px] animate-gradient-drift opacity-60"
          style={{
            background: 'radial-gradient(circle, hsl(82 85% 55% / 0.35) 0%, hsl(82 85% 55% / 0.15) 50%, transparent 70%)',
            top: '-40%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
        {/* Cyan/teal accent blob */}
        <div
          className="absolute w-[700px] h-[700px] rounded-full blur-[100px] animate-gradient-drift-reverse opacity-50"
          style={{
            background: 'radial-gradient(circle, hsl(170 80% 45% / 0.25) 0%, hsl(160 70% 40% / 0.1) 50%, transparent 70%)',
            top: '-20%',
            left: '10%',
          }}
        />
        {/* Yellow/warm accent blob */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[90px] animate-gradient-drift-slow opacity-40"
          style={{
            background: 'radial-gradient(circle, hsl(50 100% 50% / 0.25) 0%, hsl(40 100% 45% / 0.1) 50%, transparent 70%)',
            bottom: '-10%',
            right: '5%',
          }}
        />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="Schelling Point"
              width={40}
              height={40}
              className="rounded-lg neon-glow"
            />
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg leading-tight">Schelling Point</span>
              <span className="text-xs text-muted-foreground leading-tight">EthBoulder™</span>
            </div>
          </div>
          <Button onClick={handleEnter} loading={isLoading} className="btn-primary-glow">
            {user ? 'Enter Event' : 'Sign In'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-20 text-center relative">
        {/* EthBoulder Badge */}
        <div className="inline-flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-4 py-2 rounded-2xl sm:rounded-full bg-primary/10 border border-primary/20 mb-8">
          <span className="text-primary text-sm font-medium">Fork The Frontier</span>
          <span className="text-muted-foreground hidden sm:inline">•</span>
          <span className="text-sm text-muted-foreground">Feb 13-15, 2026 • Boulder, CO</span>
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
          <span className="text-primary neon-text">EthBoulder</span>
          <br />
          <span className="text-foreground/90">Unconference</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          A decentralized, community-governed Ethereum event.
          <br />
          <span className="text-foreground font-medium">Propose sessions. Vote with quadratic credits. Shape the schedule together.</span>
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" onClick={handleEnter} className="btn-primary-glow text-lg h-14 px-8">
            {user ? 'View Sessions' : 'Join the Unconference'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg border-primary/30 hover:bg-primary/10">
            <Link href="/sessions">Browse Sessions</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16">
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-primary">3</div>
            <div className="text-sm text-muted-foreground">Days</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-primary">6</div>
            <div className="text-sm text-muted-foreground">Venues</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-primary">9</div>
            <div className="text-sm text-muted-foreground">Tracks</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="font-display text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="glass-card border-border/50 card-hover">
            <CardContent className="pt-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
                <Presentation className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3">Propose Sessions</h3>
              <p className="text-muted-foreground leading-relaxed">
                Share your expertise. Submit talks, workshops, or discussions on topics you're passionate about.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50 card-hover">
            <CardContent className="pt-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
                <Vote className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3">Quadratic Voting</h3>
              <p className="text-muted-foreground leading-relaxed">
                Allocate your 100 credits across sessions. The more you care, the more it costs—balancing passion with participation.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50 card-hover">
            <CardContent className="pt-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3">Build Your Schedule</h3>
              <p className="text-muted-foreground leading-relaxed">
                Save favorites, export to your calendar, and watch the community-driven schedule emerge.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quadratic Voting Explainer */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <Card className="glass-card border-primary/20 overflow-hidden">
            <CardContent className="p-8">
              <h2 className="font-display text-2xl font-bold mb-3 text-center">Quadratic Voting</h2>
              <p className="text-muted-foreground text-center mb-8">
                Express preference intensity, not just direction. The cost increases quadratically.
              </p>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { votes: 1, cost: 1 },
                  { votes: 2, cost: 4 },
                  { votes: 3, cost: 9 },
                  { votes: 4, cost: 16 },
                ].map(({ votes, cost }) => (
                  <div key={votes} className="bg-secondary/50 rounded-xl p-4 text-center border border-border/50">
                    <div className="text-3xl font-display font-bold text-primary">{votes}</div>
                    <div className="text-xs text-muted-foreground mb-2">vote{votes > 1 ? 's' : ''}</div>
                    <div className="text-lg font-semibold">{cost}</div>
                    <div className="text-xs text-muted-foreground">credit{cost > 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-6">
                Go deep on what matters or spread votes wide—your 100 credits, your strategy.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <Footer className="mt-16" />
    </div>
  )
}
