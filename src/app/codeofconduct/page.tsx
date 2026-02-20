'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/Footer'

export default function CodeOfConductPage() {
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
        <h1 className="text-3xl font-bold mb-2">Schelling Point events Code of Conduct</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          {/* 1. Our Pledge */}
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Our Pledge</h2>
            <p className="text-muted-foreground leading-relaxed">
              Schelling Point events brings together builders, researchers, organizers, and community members who share a commitment to decentralized technology in service of local communities. We pledge to make participation in our event, online spaces, and ongoing community a harassment-free experience for everyone — regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, sexual identity, or orientation.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Your safety and comfort are our priority. If you have questions or concerns at any point before, during, or after the event, contact us at{' '}
              <a href="mailto:kim@impactfulevents.io" className="text-primary hover:underline">kim@impactfulevents.io</a>{' '}
              or find an event organizer member at the event information desk.
            </p>
          </section>

          {/* 2. Scope */}
          <section>
            <h2 className="text-xl font-semibold mb-3">2. Scope</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              This Code of Conduct applies across all Schelling Point events spaces, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong className="text-foreground">In-person events</strong> — the main conference, workshops, fireside chats, side events, and social gatherings, including setup and teardown</li>
              <li><strong className="text-foreground">Online spaces</strong> — Telegram groups, Discord servers, forum threads, and any other digital channels operated by or affiliated with Schelling Point events</li>
              <li><strong className="text-foreground">Public representation</strong> — when an individual is representing Schelling Point events or its community in public (e.g., posting via official social media accounts, using an official email address, or acting as a representative at external events)</li>
            </ul>
          </section>

          {/* 3. Expected Behavior */}
          <section>
            <h2 className="text-xl font-semibold mb-3">3. Expected Behavior</h2>

            <h3 className="text-lg font-medium mt-5 mb-2">Respect</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Treat every participant, speaker, volunteer, and organizer with dignity and respect.</li>
              <li>Respect the physical and digital privacy of others.</li>
              <li>If you want to take a photo or record, get consent first. A red lanyard signifies someone who has asked not to be photographed.</li>
              <li>Follow the Chatham House Rule when indicated: you may share information from a session, but do not attribute it to a specific speaker.</li>
            </ul>

            <h3 className="text-lg font-medium mt-5 mb-2">Collaboration</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Be open to new ideas and learning from others — we are stronger when we share.</li>
              <li>In moments of disagreement, stay focused on the substance of the discussion. Agree to disagree when necessary and move toward shared goals.</li>
              <li>Talk to people you don&apos;t know. They are friends you haven&apos;t met yet.</li>
            </ul>

            <h3 className="text-lg font-medium mt-5 mb-2">Inclusion</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Mingle. We all carry perspectives that can help each other in unexpected ways.</li>
              <li>Avoid jargon, acronyms, and unnecessarily complex language when simpler phrasing will do.</li>
              <li>Follow the &quot;Rule of 1/n&quot;: in a group of n people, speak roughly 1/nth of the time. Make one point, then let others speak.</li>
            </ul>

            <h3 className="text-lg font-medium mt-5 mb-2">Communication</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Assume the most generous interpretation of what someone says. If a comment seems off, ask for clarification before reacting.</li>
              <li>Listen actively. Don&apos;t interrupt. The more concise and relatable your point, the greater its impact.</li>
              <li>Whether on a panel or in informal conversation, avoid grandstanding and create space for others to participate.</li>
            </ul>

            <h3 className="text-lg font-medium mt-5 mb-2">Integrity (Online Spaces)</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Demonstrate transparency and honesty in all interactions.</li>
              <li>Take responsibility for mistakes — acknowledge them, learn, and move on.</li>
              <li>Keep discussions organized by posting in their appropriate channels or threads.</li>
              <li>Never share API keys, secret keys, or other sensitive credentials.</li>
              <li>Do not post unsolicited referral links, Discord invitations, or promotional content unless specifically requested.</li>
              <li>Do not impersonate organizers, moderators, or other community members.</li>
              <li>No one from Schelling Point events will ever ask you to send money. Report such incidents immediately.</li>
            </ul>
          </section>

          {/* 4. Unacceptable Behavior */}
          <section>
            <h2 className="text-xl font-semibold mb-3">4. Unacceptable Behavior</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The following will not be tolerated in any Schelling Point events space:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Harassment in any form, including sustained unwanted contact after being asked to stop</li>
              <li>The use of sexualized language or imagery, and unwelcome sexual attention or advances</li>
              <li>Trolling, insults, derogatory comments, and personal or political attacks</li>
              <li>Racial slurs or discriminatory language, regardless of claimed intent or context</li>
              <li>Publishing others&apos; private information (physical address, email, etc.) without explicit permission</li>
              <li>Predatory behavior or disregard for the safety and dignity of others</li>
              <li>Threats of violence — even framed as jokes</li>
              <li>Posting NSFW content or using gratuitously offensive language</li>
              <li>Discussing or facilitating illegal activities, including tax evasion or market manipulation</li>
              <li>Any other conduct that would reasonably be considered inappropriate in a professional community setting</li>
            </ul>
          </section>

          {/* 5. Enforcement */}
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Enforcement</h2>

            <h3 className="text-lg font-medium mt-5 mb-2">Reporting</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you experience or witness a violation of this Code of Conduct:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li><strong className="text-foreground">At the event:</strong> Find an event organizer member (identifiable by a blue wristband) or go to the information desk.</li>
              <li><strong className="text-foreground">Online or after the event:</strong> Email <a href="mailto:kim@impactfulevents.io" className="text-primary hover:underline">kim@impactfulevents.io</a> with a description of the incident, the time and location (or channel), and any supporting documentation.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              All reports will be reviewed and investigated. The event organizer is obligated to maintain confidentiality regarding the identity of the reporter.
            </p>

            <h3 className="text-lg font-medium mt-5 mb-2">Response: Warning &rarr; Removal</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Schelling Point events uses a straightforward two-step enforcement model:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-3">
              <li>
                <strong className="text-foreground">Warning</strong> — A private, direct communication to the individual explaining the nature of the violation and why the behavior is unacceptable. The individual will be given an opportunity to correct course.
              </li>
              <li>
                <strong className="text-foreground">Removal</strong> — If the behavior continues after a warning — or if the initial violation is severe enough to warrant immediate action — the individual may be removed from the event and/or banned from online community spaces. This may include:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>Expulsion from the in-person event with no refund</li>
                  <li>Removal from Telegram, Discord, or other community channels</li>
                  <li>A ban from future Schelling Point events events and activities</li>
                </ul>
              </li>
            </ol>
            <p className="text-muted-foreground leading-relaxed mt-3">
              The duration and conditions of any ban will be determined by the severity of the violation. The event organizer reserves the right to skip the warning step for serious violations (e.g., threats, harassment, or behavior that endangers others).
            </p>

            <h3 className="text-lg font-medium mt-5 mb-2">Appeal</h3>
            <p className="text-muted-foreground leading-relaxed">
              Individuals subject to enforcement actions may appeal by submitting additional context or evidence in writing to{' '}
              <a href="mailto:conduct@schellingpoint.xyz" className="text-primary hover:underline">conduct@schellingpoint.xyz</a>{' '}
              within 14 days of the action. Appeals will be reviewed by a member of the organizing team who was not involved in the original decision.
            </p>
          </section>

          {/* 6. Acknowledgments */}
          <section>
            <h2 className="text-xl font-semibold mb-3">6. Acknowledgments</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              This Code of Conduct is adapted from and inspired by:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>DWeb Camp Code of Conduct</li>
              <li>Gitcoin Code of Conduct</li>
              <li>Contributor Covenant</li>
              <li>Mozilla Community Participation Guidelines</li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
