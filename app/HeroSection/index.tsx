import styles from './HeroSection.module.css'

export default function HeroSection() {
  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>Bienvenue sur Débats</h1>
      <p className={styles.subtitle}>
        Débats est un projet participatif et collaboratif qui a pour objectif d&apos;offrir une
        synthèse ouverte, impartiale et vérifiable des sujets clivants de notre société.
      </p>
    </div>
  )
}
