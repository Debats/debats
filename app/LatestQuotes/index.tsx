import RuledSection from '../../components/layout/RuledSection'
import { FeedEntry, leadOf } from '../../domain/read-models/feed-entries'
import { STATEMENTS_HREF } from '../../domain/read-models/hrefs'
import GatheredQuote from './GatheredQuote'
import StatedQuote from './StatedQuote'
import styles from './LatestQuotes.module.css'

/**
 * Les dernières entrées du flux, dans le rail de l'accueil. Une prise de
 * position s'y lit avec ses mots ; les signatures d'un texte, ou ce qu'un·e
 * auteur·rice a dit le même jour, tiennent en une phrase.
 */
export default function LatestQuotes({ entries }: { entries: FeedEntry[] }) {
  if (entries.length === 0) return null

  return (
    <RuledSection
      title="Dernières prises de position"
      more={{ href: STATEMENTS_HREF, label: 'Tout le flux' }}
    >
      <ol className={styles.list}>
        {entries.map((entry) =>
          entry.kind === 'statement' ? (
            <StatedQuote key={entry.entry.statement.id} entry={entry.entry} />
          ) : (
            <GatheredQuote key={leadOf(entry).statement.id} entry={entry} />
          ),
        )}
      </ol>
    </RuledSection>
  )
}
