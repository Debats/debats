import Link from 'next/link'
import Image from 'next/image'
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
              Mode d'emploi
            </Link>
          </nav>

          <div className={styles.authSection}>
            <button className={styles.authLink}>
              Connexion
            </button>
            <button className={styles.signupBtn}>
              Inscription
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
