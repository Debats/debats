import Link from 'next/link'
import { FigureIndexEntry } from '../../../domain/read-models/figure-index'
import { figureHref } from '../../../domain/read-models/hrefs'
import styles from './FiguresToDocument.module.css'

interface FiguresToDocumentProps {
  figures: FigureIndexEntry[]
}

/** « aucune », « 1 prise » */
const statementsLabel = (count: number) => (count === 0 ? 'aucune' : `${count} prise`)

/** Encart du rail : quelques personnalités qu'une citation sourcée suffit à enrichir. */
export default function FiguresToDocument({ figures }: FiguresToDocumentProps) {
  if (figures.length === 0) return null

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Personnalités à documenter</h2>
      <p className={styles.intro}>
        Ces personnalités ont au plus une prise de position. Vous en connaissez une autre ? Une
        citation sourcée suffit.
      </p>
      <ul className={styles.list}>
        {figures.map((figure) => (
          <li key={figure.id} className={styles.item}>
            <Link href={figureHref(figure.slug)} className={styles.figure}>
              {figure.name}
            </Link>
            <span className={styles.count}>{statementsLabel(figure.statementsCount)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
