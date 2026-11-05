import { formatShortDate } from '../../../lib/format-date'
import { plural } from '../../../lib/plural'
import styles from './AuthorOnSubject.module.css'

interface SynthesisProps {
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
 * recherche autre chose qu'une citation isolée.
 *
 * Rien n'y accorde en genre : l'auteur est aussi bien une personnalité
 * qu'une organisation, et le site écrit de façon inclusive.
 */
export default function Synthesis({
  authorName,
  subjectTitle,
  statements,
  positionTitles,
  allies,
  undefended,
  latest,
}: SynthesisProps) {
  if (statements === 0) {
    return (
      <p className={styles.synthesis}>
        Débats.co ne recense aucune prise de position de <strong>{authorName}</strong> sur{' '}
        {subjectTitle}.
      </p>
    )
  }

  return (
    <p className={styles.synthesis}>
      Sur {subjectTitle}, Débats.co recense{' '}
      <strong>
        {statements} {plural(statements, 'prise de position', 'prises de position')}
      </strong>{' '}
      de <strong>{authorName}</strong>
      {latest && (
        <>
          , {statements === 1 ? 'le' : 'la dernière le'} {formatShortDate(latest)}
        </>
      )}
      {'. '}
      {plural(positionTitles.length, 'Position défendue', 'Positions défendues')} :{' '}
      <strong>{positionTitles.join(', ')}</strong>
      {allies > 0 ? (
        <>
          {' '}
          — {plural(positionTitles.length, 'partagée', 'partagées')} par {allies}{' '}
          {plural(allies, 'autre voix recensée ici', 'autres voix recensées ici')}
        </>
      ) : (
        <> — que personne d’autre n’a encore défendue ici</>
      )}
      .
      {undefended > 0 && (
        <>
          {' '}
          {undefended} {plural(undefended, 'autre position reste', 'autres positions restent')}{' '}
          {plural(undefended, 'ouverte', 'ouvertes')} sur ce sujet sans que personne ne{' '}
          {plural(undefended, 'la', 'les')} défende.
        </>
      )}
    </p>
  )
}
