import { Suspense } from 'react'
import './global.css'
import '../styles/debats-colors.css'
import '../styles/layout.css'
import PlausibleProvider from 'next-plausible'
import Header from '../components/layout/header'
import Footer from '../components/layout/footer'
import NoticeBanner from '../components/layout/NoticeBanner'
import FeedbackWidget from '../components/feedback/FeedbackWidget'

import { Metadata, Viewport } from 'next'

const siteDescription =
  'Une synthèse ouverte, impartiale et vérifiable des sujets clivants de notre société.'

// Source de vérité CSS : --debats-red dans styles/debats-colors.css
const DEBATS_RED = '#f21e40'

export const viewport: Viewport = {
  themeColor: DEBATS_RED,
}

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
    <html lang="fr">
      <body>
        <PlausibleProvider domain="debats.co">
          <div className="layout-container">
            <Header />
            <main className="main-content">
              <Suspense>
                <NoticeBanner />
              </Suspense>
              <div className="page-content">{children}</div>
            </main>
            <Footer />
            <FeedbackWidget />
          </div>
        </PlausibleProvider>
      </body>
    </html>
  )
}
