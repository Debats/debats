import Segmented from '../../../../components/ui/Segmented'
import { StatementAuthorKind } from '../../../../domain/entities/statement'
import styles from './PositionsFilter.module.css'

interface PositionsFilterProps {
  subjectSlug: string
  /** Le type d'auteur retenu, ou tous */
  authorKind?: StatementAuthorKind
  counts: {
    all: number
    publicFigures: number
    organisations: number
  }
  positionsCount: number
}

/** Valeur du paramètre d'URL `qui` pour chaque type d'auteur */
export const AUTHOR_KIND_PARAMS: Record<StatementAuthorKind, string> = {
  public_figure: 'personnalites',
  organisation: 'organisations',
}

/** Le type d'auteur demandé par l'URL, s'il est connu */
export function parseAuthorKindParam(value: unknown): StatementAuthorKind | undefined {
  if (value === AUTHOR_KIND_PARAMS.public_figure) return 'public_figure'
  if (value === AUTHOR_KIND_PARAMS.organisation) return 'organisation'
  return undefined
}

const LABELS: Record<StatementAuthorKind, string> = {
  public_figure: 'Personnalités',
  organisation: 'Organisations',
}

/** Filtre des prises de position par type d'auteur, porté par l'URL du sujet. */
export default function PositionsFilter({
  subjectSlug,
  authorKind,
  counts,
  positionsCount,
}: PositionsFilterProps) {
  const base = `/s/${subjectSlug}`
  return (
    <div className={styles.row}>
      <Segmented
        ariaLabel="Filtrer les prises de position"
        active={authorKind ? LABELS[authorKind] : 'Tous'}
        items={[
          { label: 'Tous', count: counts.all, href: base },
          {
            label: LABELS.public_figure,
            count: counts.publicFigures,
            href: `${base}?qui=${AUTHOR_KIND_PARAMS.public_figure}`,
          },
          {
            label: LABELS.organisation,
            count: counts.organisations,
            href: `${base}?qui=${AUTHOR_KIND_PARAMS.organisation}`,
          },
        ]}
      />
      {positionsCount > 1 && <p className={styles.hint}>Triées par soutien décroissant</p>}
    </div>
  )
}
