import { redirect } from 'next/navigation'

/**
 * Platform Landing Page
 *
 * For Phase 1 (single-tenant migration), this simply redirects to the
 * EthBoulder 2026 event. Phase 2 will add event discovery functionality.
 */
export default function LandingPage() {
  redirect('/e/ethboulder-2026')
}
