import ActionLink from '../../ui/ActionLink'
import styles from './RuledSection.module.css'

interface RuledSectionProps {
  /** L'ancre de la section, quand une barre d'ancres ou un lien y mène */
  id?: string
  title: string
  /** Combien la section en compte en tout, quand elle n'en montre qu'une partie */
  count?: number
  /** Ce que la section donne à lire, en une phrase sous son titre */
  intro?: string
  /** Où lire la suite de ce que la section ne fait qu'entamer */
  more?: { href: string; label: string }
  /** La suite se propose dès le titre, au bout du filet, plutôt qu'au pied */
  moreInHead?: boolean
  /** La section vit sous un titre de chapitre : son titre descend d'un rang */
  nested?: boolean
  children: React.ReactNode
}

/**
 * Une section sous un filet d'encre, dans une colonne comme dans un rail : son
 * titre, ce qu'elle compte, son contenu, la suite.
 */
export default function RuledSection({
  id,
  title,
  count,
  intro,
  more,
  moreInHead,
  nested,
  children,
}: RuledSectionProps) {
  const link = more && <ActionLink href={more.href}>{more.label} →</ActionLink>
  const Title = nested ? 'h3' : 'h2'

  return (
    <section id={id} className={styles.section}>
      <header className={styles.head}>
        <Title className={styles.title}>{title}</Title>
        {count !== undefined && (
          <span className={styles.count}>{count.toLocaleString('fr-FR')}</span>
        )}
        {moreInHead && <span className={styles.headLink}>{link}</span>}
      </header>
      {intro && <p className={styles.intro}>{intro}</p>}
      {children}
      {!moreInHead && link && <p>{link}</p>}
    </section>
  )
}
