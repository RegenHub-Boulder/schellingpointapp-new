'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/Footer'

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Schelling Point ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Schelling Point is a session coordination platform for unconferences, hackathons, and community events, enabling participants to propose
              sessions, vote using quadratic voting, and help shape event schedules. The Service enables communities
              to collaboratively organize their events.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">User Accounts</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>You must provide accurate information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must not share your login credentials with others</li>
              <li>One account per person is permitted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When using the Service, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Submit only genuine session proposals relevant to the event themes</li>
              <li>Vote honestly and not attempt to manipulate the voting system</li>
              <li>Respect other community members and their contributions</li>
              <li>Not post offensive, discriminatory, or inappropriate content</li>
              <li>Not attempt to circumvent security measures or exploit the platform</li>
              <li>Not use the Service for any unlawful purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Quadratic Voting</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service uses quadratic voting to allocate session votes. Each user receives 100 credits to distribute
              among sessions. The cost increases quadratically (1 vote = 1 credit, 2 votes = 4 credits, etc.).
              Attempting to game the system through multiple accounts or other means will result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Content Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of content you submit (session proposals, profile information). By submitting content,
              you grant Schelling Point and event organizers a non-exclusive license to display and use that content in connection
              with the event and platform promotion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Moderation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Session proposals are subject to review by event organizers. We reserve the right to reject, modify,
              or remove content that violates these terms or is deemed inappropriate for the event. Final scheduling
              decisions are made by event organizers based on votes and logistical considerations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" without warranties of any kind. We do not guarantee that sessions will
              be scheduled or that the platform will be available without interruption. Participation in
              event sessions is at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Schelling Point and event organizers shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms of Service from time to time. Continued use of the Service after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please contact us at{' '}
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
