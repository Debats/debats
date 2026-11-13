import Image from 'next/image'
import SearchForm from '../../components/search/SearchForm'
import { siteDescription } from '../site'
import styles from './HeroSection.module.css'

/**
 * L'ouverture de l'accueil : la promesse du site, la recherche à portée de
 * main. La photo en bichromie papier / encre court sur toute la largeur et se
 * fond dans le papier côté texte.
 */
export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <Image
        src="/images/home-banner.jpg"
        alt=""
        fill
        sizes="100vw"
        priority
        className={styles.photo}
      />
      <div className={styles.veil} aria-hidden="true" />
      <div className={styles.container}>
        <h1 className={styles.title}>Qui pense quoi ?</h1>
        <p className={styles.subtitle}>{siteDescription}</p>
        <SearchForm prominent />
      </div>
    </section>
  )
}
