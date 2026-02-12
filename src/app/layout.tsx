import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ),
  title: 'Schelling Point - EthBoulder 2026',
  description: 'The unconference for EthBoulder 2026. Propose sessions, vote with quadratic voting, and shape the schedule together.',
  icons: {
    icon: '/favicon_2026.png',
    apple: '/webclip.jpeg',
  },
  openGraph: {
    title: 'Schelling Point - EthBoulder 2026',
    description: 'The unconference for EthBoulder 2026. Propose sessions, vote with quadratic voting, and shape the schedule together.',
    images: [
      {
        url: '/ethboulder_banner.png',
        width: 1200,
        height: 630,
        alt: 'Schelling Point - EthBoulder 2026 Unconference',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Schelling Point - EthBoulder 2026',
    description: 'The unconference for EthBoulder 2026. Propose sessions, vote with quadratic voting, and shape the schedule together.',
    images: ['/ethboulder_banner.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark overflow-x-hidden">
      <body className={`${inter.className} min-h-screen bg-background antialiased overflow-x-hidden`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
