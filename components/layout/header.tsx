import Link from 'next/link'
import Image from 'next/image'
import AuthSection from '../auth/AuthSection'
import styles from './header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.content}>
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

          <nav className={styles.nav}>
            <Link href="/s" className={styles.navLink}>
              Sujets
            </Link>
            <Link href="/p" className={styles.navLink}>
              Personnalités
            </Link>
            <Link href="/guide" className={styles.navLink}>
              Mode d&apos;emploi
            </Link>
          </nav>

          <AuthSection />
        </div>
      </div>
    </header>
  )
}
