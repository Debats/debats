import ActionLink from '../../components/ui/ActionLink'
import styles from './HomeSection.module.css'

interface HomeSectionProps {
  title: string
  /** Où lire la suite de ce que la section ne fait qu'entamer */
  more?: { href: string; label: string }
  children: React.ReactNode
}

/**
 * Une section de l'accueil, dans la colonne comme dans le rail : son titre sur
 * un filet d'encre, son contenu, la suite.
 */
export default function HomeSection({ title, more, children }: HomeSectionProps) {
  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
      </header>
      {children}
      {more && (
        <p>
          <ActionLink href={more.href}>{more.label} →</ActionLink>
        </p>
      )}
    </section>
  )
}
