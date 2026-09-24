import styles from './PageHero.module.css'

interface PageHeroProps {
  /** Petit libellé au-dessus du titre (« Explorer », « Thématique »…) */
  kicker?: string
  title: string
  intro?: string
  /** Boutons alignés à droite du titre */
  actions?: React.ReactNode
  /** Contenu sous le titre, typiquement un champ de recherche */
  children?: React.ReactNode
}

/** Bandeau d'en-tête des pages d'index et de liste. */
export default function PageHero({ kicker, title, intro, actions, children }: PageHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.row}>
          <div className={styles.main}>
            {kicker && <p className={styles.kicker}>{kicker}</p>}
            <h1 className={styles.title}>{title}</h1>
            {intro && <p className={styles.intro}>{intro}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
        {children && <div className={styles.extra}>{children}</div>}
      </div>
    </section>
  )
}
