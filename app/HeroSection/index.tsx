import Image from 'next/image'
import Button from '../../components/ui/Button'
import { siteDescription } from '../site'
import styles from './HeroSection.module.css'

/** Bannière d'accueil : photo en bichromie papier / encre, promesse du site, deux actions. */
export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.banner}>
        <Image
          src="/images/home-banner.jpg"
          alt=""
          fill
          sizes="100vw"
          priority
          className={styles.photo}
        />
      </div>
      <div className={styles.container}>
        <h1 className={styles.title}>Qui pense quoi ?</h1>
        <p className={styles.subtitle}>{siteDescription}</p>
        <div className={styles.actions}>
          <Button href="/s">Explorer les sujets</Button>
          <Button href="/contribuer" variant="secondary">
            Contribuer
          </Button>
        </div>
      </div>
    </section>
  )
}
