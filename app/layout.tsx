import { Suspense } from 'react'
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import '../styles/tokens.css'
import '../styles/base.css'
import styles from './layout.module.css'
import PlausibleProvider from 'next-plausible'
import Header from '../components/layout/header'
import { ShareButtonProvider } from '../components/ui/ShareButton/ShareButtonContext'
import Footer from '../components/layout/footer'
import NoticeBanner from '../components/layout/NoticeBanner'
import FeedbackWidget from '../components/feedback/FeedbackWidget'

import { Metadata, Viewport } from 'next'
import { siteDescription } from './site'

// Source de vérité CSS : --signal dans styles/tokens.css
const DEBATS_SIGNAL = '#e3243f'

export const viewport: Viewport = {
  themeColor: DEBATS_SIGNAL,
}

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
})

// Famille limitée à la graisse 600 : sert d'alias à --font-gotham-bold pour les
// feuilles héritées qui s'appuyaient sur la fonte, pas sur font-weight, pour le gras.
const sansSemibold = Instrument_Sans({
  subsets: ['latin'],
  weight: '600',
  variable: '--font-instrument-sans-semibold',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const fontVariables = [serif, sans, sansSemibold, mono].map((font) => font.variable).join(' ')

export const metadata: Metadata = {
  metadataBase: new URL('https://debats.co'),
  title: {
    default: 'Débats.co - Synthèse des débats de société',
    template: '%s - Débats.co',
  },
  description: siteDescription,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Débats',
  },
  openGraph: {
    siteName: 'Débats.co',
    locale: 'fr_FR',
    type: 'website',
    images: ['/images/logo.png'],
  },
  twitter: {
    card: 'summary',
    images: ['/images/logo.png'],
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  other: {
    'tdm:reservation': '1',
    'tdm:policy': 'https://debats.co/mentions-legales',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontVariables}>
      <body>
        <PlausibleProvider domain="debats.co">
          <ShareButtonProvider>
            <div className={styles.container}>
              <Header />
              <main className={styles.main}>
                <Suspense>
                  <NoticeBanner />
                </Suspense>
                <div className={styles.page}>{children}</div>
              </main>
              <Footer />
              <FeedbackWidget />
            </div>
          </ShareButtonProvider>
        </PlausibleProvider>
      </body>
    </html>
  )
}
