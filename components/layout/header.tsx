'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AuthSection from '../auth/AuthSection'
import styles from './header.module.css'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <div className={styles.logoSection}>
            <Link href="/" onClick={closeMenu}>
              <Image
                src="/images/header.png"
                alt="Débats.co"
                width={125}
                height={42}
                className={styles.logo}
              />
            </Link>
          </div>

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

        <div className={`${styles.menu} ${menuOpen ? styles.menuOpen : ''}`}>
          <nav className={styles.nav}>
            <Link href="/s" className={styles.navLink} onClick={closeMenu}>
              Sujets
            </Link>
            <Link href="/p" className={styles.navLink} onClick={closeMenu}>
              Personnalités
            </Link>
            <Link href="/contribuer" className={styles.navLink} onClick={closeMenu}>
              Contribuer
            </Link>
          </nav>

          <AuthSection />
        </div>
      </div>
    </header>
  )
}
