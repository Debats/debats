import Link from 'next/link'
import Button from '../../../components/ui/Button'
import {
  ENTITY_KIND_LABELS,
  EntityCard,
  FlaggedEntity,
} from '../../../domain/read-models/flag-queue'
import { flaggedEntityHref } from '../../../domain/read-models/hrefs'
import { formatShortDate } from '../../../lib/format-date'
import { plural } from '../../../lib/plural'
import FlagNote from '../FlagNote'
import styles from './FlaggedEntityRow.module.css'

interface FlaggedEntityRowProps {
  entry: FlaggedEntity
  /** Absent quand les tables ne tiennent plus l'entité du tout */
  card: EntityCard | undefined
  /** Les signalements sont encore ouverts : la ligne mène à leur traitement */
  toSettle: boolean
}

/** Une entité signalée dans la file : ce qu'elle est, ce qu'on lui reproche, et le chemin pour trancher. */
export default function FlaggedEntityRow({ entry, card, toSettle }: FlaggedEntityRowProps) {
  const { entity, flags } = entry
  const title = card?.title ?? 'Contenu disparu'

  return (
    <article className={styles.row}>
      <div className={styles.body}>
        <p className={styles.kicker}>
          {ENTITY_KIND_LABELS[entity.type]} · depuis le {formatShortDate(flags[0].at)} ·{' '}
          {flags.length} {plural(flags.length, 'signalement', 'signalements')}
        </p>
        <p className={styles.title}>
          {card?.href ? (
            <Link href={card.href} className={styles.titleLink}>
              {title}
            </Link>
          ) : (
            title
          )}
          {card?.detail && <span className={styles.detail}> {card.detail}</span>}
        </p>
        <div className={styles.flags}>
          {flags.map((flag) => (
            <FlagNote key={flag.id} flag={flag} />
          ))}
        </div>
      </div>
      {toSettle && (
        <Button href={flaggedEntityHref(entity)} variant="secondary" size="small">
          Traiter
        </Button>
      )}
    </article>
  )
}
