import { JointDeclaration } from '../../../../domain/entities/joint-declaration'
import { formatDate } from '../../../../lib/format-date'
import styles from './TextCard.module.css'

interface TextCardProps {
  declaration: JointDeclaration
}

/** Carte du rail : d'où vient le texte, et le lien pour le lire à la source. */
export default function TextCard({ declaration }: TextCardProps) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Le texte</h2>
      <dl className={styles.facts}>
        <dt className={styles.term}>Publié</dt>
        <dd className={styles.value}>{formatDate(declaration.declaredAt)}</dd>
        <dt className={styles.term}>Source</dt>
        <dd className={styles.value}>{declaration.sourceName}</dd>
      </dl>
      <a
        href={declaration.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        Lire le texte à la source
      </a>
    </section>
  )
}
