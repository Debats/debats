'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AuthSection from '../auth/AuthSection'
import Button from '../ui/Button'
import ComingSoon from '../ui/ComingSoon'
import ShareButton from '../ui/ShareButton'
import { useShareButtonContext } from '../ui/ShareButton/ShareButtonContext'
import SiteSearch from './SiteSearch'
import SearchIcon from './SiteSearch/SearchIcon'
import styles from './header.module.css'

interface NavEntry {
  label: string
  href?: string
}

/** Une entrée sans href est annoncée mais pas encore disponible */
/** Whether the page lives in this section: `/p/x` under `/p`, but `/prises-de-position` not under `/p` */
const isUnder = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

const navEntries: NavEntry[] = [
  { label: 'Sujets', href: '/s' },
  { label: 'Personnalités', href: '/p' },
  { label: 'Organisations', href: '/o' },
  { label: 'Arguments', href: '/arguments' },
  { label: 'Prises de position', href: '/prises-de-position' },
  { label: 'Méthode', href: '/guide' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { hasPageShareButton } = useShareButtonContext()
  const pathname = usePathname()

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.brand}>
            <Image
              src="/images/logo-mark.png"
              alt=""
              width={33}
              height={32}
              className={styles.mark}
            />
            <span className={styles.wordmark}>Débats</span>
          </Link>

          <div className={styles.mobileActions}>
            <Link href="/recherche" className={styles.mobileSearch} aria-label="Rechercher">
              <SearchIcon />
            </Link>
            {!hasPageShareButton && <ShareButton iconOnly />}
            <button
              className={styles.burger}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
            >
              <span className={styles.burgerLine} />
              <span className={styles.burgerLine} />
              <span className={styles.burgerLine} />
            </button>
          </div>
        </div>

        <div className={`${styles.menu} ${menuOpen ? styles.menuOpen : ''}`}>
          <nav className={styles.nav}>
            {navEntries.map(({ href, label }) =>
              href ? (
                <Link
                  key={label}
                  href={href}
                  className={styles.navLink}
                  aria-current={isUnder(pathname, href) ? 'page' : undefined}
                >
                  {label}
                </Link>
              ) : (
                <ComingSoon key={label}>
                  <span className={styles.navLink}>{label}</span>
                </ComingSoon>
              ),
            )}
          </nav>

          <div className={styles.tools}>
            <SiteSearch />
            <Button href="/contribuer" size="small">
              Contribuer
            </Button>
            <AuthSection onAuthChange={() => setMenuOpen(false)} />
          </div>
        </div>
      </div>
    </header>
  )
}
