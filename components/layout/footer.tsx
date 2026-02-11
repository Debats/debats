import Link from 'next/link'
import styles from './footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.legal}>
          <small className={styles.legalText}>
            <Link href="/credits" className={styles.legalLink}>Crédits</Link>
            <span className={styles.separator}>|</span>
            <Link href="/mentions-legales" className={styles.legalLink}>Mentions légales</Link>
          </small>
        </div>
        
        <div className={styles.navigation}>
          <nav>
            <ul className={styles.navList}>
              <li className={styles.navItem}>
                <Link href="/a-propos" className={styles.navLink}>
                  À propos
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link href="/contact" className={styles.navLink}>
                  Contact
                </Link>
              </li>
              <li className={styles.navItem}>
                <a 
                  href="https://twitter.com/debatsco" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.externalLink}
                >
                  Twitter
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}