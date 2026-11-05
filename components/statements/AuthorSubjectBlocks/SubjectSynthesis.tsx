import { subjectSynthesis } from '../../../domain/read-models/author-subject-synthesis'
import { elide } from '../../../lib/elision'
import { formatShortDate } from '../../../lib/format-date'
import styles from './AuthorSubjectBlocks.module.css'

interface SubjectSynthesisProps {
  authorName: string
  subjectTitle: string
  statements: number
  /** Les positions que l'auteur défend, dans l'ordre d'apparition */
  positionTitles: string[]
  /** Les autres voix qui défendent une de ses positions */
  allies: number
  /** Les positions ouvertes que personne n'a encore défendue */
  undefended: number
  latest: Date | null
}

/**
 * La page n'a presque aucun texte : trois lignes construites depuis les
 * données répondent avant le défilement, et donnent aux moteurs de
 * recherche autre chose qu'une citation isolée. Les règles d'accord et les
 * branches vivent dans `subjectSynthesis`, ici on ne fait que les placer.
 */
export default function SubjectSynthesis({
  authorName,
  subjectTitle,
  statements,
  positionTitles,
  allies,
  undefended,
  latest,
}: SubjectSynthesisProps) {
  const sentence = subjectSynthesis({
    statements,
    positionTitles,
    allies,
    undefended,
    latest: latest && formatShortDate(latest),
  })

  if (!sentence.statements) {
    return (
      <p className={styles.synthesis}>
        Débats.co ne recense aucune prise de position {elide('de', authorName)}
        <strong>{authorName}</strong> sur {subjectTitle}.
      </p>
    )
  }

  return (
    <p className={styles.synthesis}>
      Sur {subjectTitle}, Débats.co recense <strong>{sentence.statements}</strong>{' '}
      {elide('de', authorName)}
      <strong>{authorName}</strong>
      {sentence.when && <>, {sentence.when}</>}
      {'. '}
      {sentence.positionsLabel} : <strong>{positionTitles.join(', ')}</strong> — {sentence.shared}.
      {sentence.undefended && <> {sentence.undefended}</>}
    </p>
  )
}
