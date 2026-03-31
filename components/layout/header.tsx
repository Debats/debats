'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AuthSection from '../auth/AuthSection'
import ShareButton from '../ui/ShareButton'
import { useShareButtonContext } from '../ui/ShareButton/ShareButtonContext'
import styles from './header.module.css'

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
          <div className={styles.logoSection}>
            <Link href="/">
              <Image
                src="/images/header.png"
                alt="Débats.co"
                width={125}
                height={42}
                className={styles.logo}
              />
            </Link>
          </div>

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
            <Link href="/s" className={styles.navLink}>
              Sujets
            </Link>
            <Link href="/p" className={styles.navLink}>
              Personnalités
            </Link>
            <Link href="/contribuer" className={styles.navLink}>
              Contribuer
            </Link>
          </nav>

          <AuthSection />
        </div>
      </div>
    </header>
  )
}
