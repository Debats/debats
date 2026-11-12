import ActionLink from '../../components/ui/ActionLink'
import styles from './RailSection.module.css'

interface RailSectionProps {
  title: string
  /** Où lire la suite de ce que la section ne fait qu'entamer */
  more?: { href: string; label: string }
  children: React.ReactNode
}

/** Une section du rail de l'accueil : son titre sur un filet d'encre, son contenu, la suite. */
export default function RailSection({ title, more, children }: RailSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      {children}
      {more && (
        <p>
          <ActionLink href={more.href}>{more.label} →</ActionLink>
        </p>
      )}
    </section>
  )
}
