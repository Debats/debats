import './global.css'
import '../styles/debats-colors.css'
import '../styles/layout.css'
import PlausibleProvider from 'next-plausible'
import { StyledComponentsRegistry } from './registry'
import Header from '../components/layout/header'
import Footer from '../components/layout/footer'

export const metadata = {
  title: 'Débats.co - Synthèse des débats de société',
  description:
    'Une synthèse ouverte, impartiale et vérifiable des sujets clivants de notre société.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <PlausibleProvider domain="debats.co">
          <StyledComponentsRegistry>
            <div className="layout-container">
              <Header />
              <main className="main-content">
                <div className="page-content">{children}</div>
              </main>
              <Footer />
            </div>
          </StyledComponentsRegistry>
        </PlausibleProvider>
      </body>
    </html>
  )
}
