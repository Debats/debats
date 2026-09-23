'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AuthSection from '../auth/AuthSection'
import Button from '../ui/Button'
import ShareButton from '../ui/ShareButton'
import { useShareButtonContext } from '../ui/ShareButton/ShareButtonContext'
import styles from './header.module.css'

const navLinks = [
  { href: '/s', label: 'Sujets' },
  { href: '/p', label: 'Personnalités' },
  { href: '/themes', label: 'Thématiques' },
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
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={styles.navLink}
                aria-current={pathname.startsWith(href) ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className={styles.tools}>
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
