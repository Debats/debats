import { Suspense } from 'react'
import './global.css'
import '../styles/debats-colors.css'
import '../styles/layout.css'
import PlausibleProvider from 'next-plausible'
import Header from '../components/layout/header'
import Footer from '../components/layout/footer'
import AuthErrorBanner from '../components/layout/AuthErrorBanner'

import { Metadata } from 'next'

const siteDescription =
  'Une synthèse ouverte, impartiale et vérifiable des sujets clivants de notre société.'

export const metadata: Metadata = {
  metadataBase: new URL('https://debats.co'),
  title: {
    default: 'Débats.co - Synthèse des débats de société',
    template: '%s - Débats.co',
  },
  description: siteDescription,
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
            <Suspense>
              <AuthErrorBanner />
            </Suspense>
            <main className="main-content">
              <div className="page-content">{children}</div>
            </main>
            <Footer />
          </div>
        </PlausibleProvider>
      </body>
    </html>
  )
}
