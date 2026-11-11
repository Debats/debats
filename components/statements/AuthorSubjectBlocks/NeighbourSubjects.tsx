import Link from 'next/link'
import { NeighbourSubject } from '../../../domain/read-models/author-subject-page'
import { subjectHref } from '../../../domain/read-models/hrefs'
import {
  authorOnSubjectHref,
  StatementAuthorRef,
} from '../../../domain/read-models/statement-author'
import { plural } from '../../../lib/plural'
import styles from './AuthorSubjectBlocks.module.css'

interface NeighbourSubjectsProps {
  author: StatementAuthorRef
  neighbours: NeighbourSubject[]
}

/**
 * Les sujets liés à celui-ci, avec ce que l'auteur y défend. C'est la seule
 * porte de sortie utile de la page pour un visiteur venu d'un moteur de
 * recherche, et le maillage interne qui manque le plus.
 */
export default function NeighbourSubjects({ author, neighbours }: NeighbourSubjectsProps) {
  if (neighbours.length === 0) return null

  return (
    <section className={styles.others}>
      <header className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{author.name} sur les sujets voisins</h2>
      </header>
      <div className={styles.neighbours}>
        {neighbours.map((neighbour) => (
          <Link
            key={neighbour.slug}
            href={
              neighbour.statements > 0
                ? authorOnSubjectHref(author, neighbour.slug)
                : subjectHref(neighbour.slug)
            }
            className={neighbour.statements > 0 ? styles.neighbour : styles.neighbourSilent}
          >
            <span className={styles.kicker}>
              {neighbour.statements > 0 ? 'Sujet lié' : 'Sujet lié · aucune prise de position'}
            </span>
            <span className={styles.neighbourTitle}>{neighbour.title}</span>
            {neighbour.statements > 0 && (
              <span className={styles.neighbourPosition}>
                {plural(neighbour.positions.length, 'Position défendue', 'Positions défendues')} :{' '}
                <strong>{neighbour.positions.join(', ')}</strong>
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
