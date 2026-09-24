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
import styles from './header.module.css'

interface NavEntry {
  label: string
  href?: string
}

/** Une entrée sans href est annoncée mais pas encore disponible */
const navEntries: NavEntry[] = [
  { label: 'Sujets', href: '/s' },
  { label: 'Personnalités', href: '/p' },
  { label: 'Organisations' },
  { label: 'Prises de position' },
  { label: 'Méthode', href: '/guide' },
]

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

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
                  aria-current={pathname.startsWith(href) ? 'page' : undefined}
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
            <ComingSoon className={styles.searchSoon}>
              <span className={styles.search}>
                <SearchIcon />
                <span>Un sujet, une personnalité…</span>
              </span>
            </ComingSoon>
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
