'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-14">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              Schelling Point ("we", "our", or "us") is a session coordination platform for unconferences, hackathons, and community events.
              This Privacy Policy explains how we collect, use, and protect your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Account Information:</strong> Email address used for authentication via magic link</li>
              <li><strong className="text-foreground">Profile Information:</strong> Display name, bio, organization, and social links you choose to provide</li>
              <li><strong className="text-foreground">Session Data:</strong> Sessions you propose, votes you cast, and favorites you save</li>
              <li><strong className="text-foreground">Usage Data:</strong> Basic analytics to improve the platform experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>To authenticate and secure your account</li>
              <li>To display your profile and sessions to other event attendees</li>
              <li>To power the quadratic voting system</li>
              <li>To generate the event schedule based on community votes</li>
              <li>To communicate event-related updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information. Your profile information and proposed sessions are visible to other
              authenticated users of the platform. Vote counts are aggregated and displayed publicly, but individual voting
              choices are kept private.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using Supabase, a trusted cloud database provider. We implement appropriate
              technical and organizational measures to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can update or delete your profile information at any time through the Settings page.
              To request complete deletion of your account and associated data, please contact us at{' '}
              <a href="mailto:support@schellingpoint.xyz" className="text-primary hover:underline">
                support@schellingpoint.xyz
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication purposes only. We do not use tracking cookies or third-party
              advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify users of any material changes by
              posting the new policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:support@schellingpoint.xyz" className="text-primary hover:underline">
                support@schellingpoint.xyz
              </a>.
            </p>
          </section>
        </div>
      </main>

      <Footer variant="minimal" className="mt-auto" />
    </div>
  )
}
