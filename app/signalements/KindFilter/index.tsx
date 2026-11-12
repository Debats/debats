import Link from 'next/link'
import { REVIEWED_ENTITY_TYPES } from '../../../domain/aggregates/review-events'
import {
  ENTITY_KIND_LABELS,
  FlagsView,
  flagsViewHref,
} from '../../../domain/read-models/flag-queue'
import styles from './KindFilter.module.css'

interface KindFilterProps {
  view: FlagsView
}

/** Restreint la file à un type d'entité ; le choix vit dans l'adresse. */
export default function KindFilter({ view }: KindFilterProps) {
  const choices = [
    { type: null, label: 'Tout' },
    ...REVIEWED_ENTITY_TYPES.map((type) => ({ type, label: ENTITY_KIND_LABELS[type] })),
  ]

  return (
    <nav className={styles.filter} aria-label="Type de contenu signalé">
      {choices.map(({ type, label }) => (
        <Link
          key={label}
          href={flagsViewHref({ ...view, type })}
          className={styles.choice}
          aria-current={view.type === type ? 'true' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
