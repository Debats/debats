import RuledSection from '../../components/layout/RuledSection'
import { FeedEntry } from '../../domain/read-models/feed-entries'
import { STATEMENTS_HREF } from '../../domain/read-models/hrefs'
import SameDayQuote from './SameDayQuote'
import SignedQuote from './SignedQuote'
import StatedQuote from './StatedQuote'
import styles from './LatestQuotes.module.css'

/**
 * Les dernières entrées du flux, dans le rail de l'accueil : ce que chacun·e
 * a dit ou fait, les textes signés à plusieurs en une entrée par texte, et
 * une entrée par auteur·rice pour ce qui s'est dit le même jour.
 */
export default function LatestQuotes({ entries }: { entries: FeedEntry[] }) {
  if (entries.length === 0) return null

  return (
    <RuledSection
      title="Dernières prises de position"
      more={{ href: STATEMENTS_HREF, label: 'Tout le flux' }}
    >
      <ol className={styles.list}>
        {entries.map((latest) => {
          switch (latest.kind) {
            case 'signatures':
              return (
                <SignedQuote
                  key={latest.declaration.id}
                  declaration={latest.declaration}
                  source={{
                    name: latest.first.statement.sourceName,
                    statedAt: latest.first.statement.statedAt,
                  }}
                  named={latest.named}
                  others={latest.others}
                />
              )
            case 'sameDay':
              return (
                <SameDayQuote
                  key={latest.entries[0].statement.id}
                  author={latest.author}
                  entries={latest.entries}
                />
              )
            case 'statement':
              return <StatedQuote key={latest.entry.statement.id} entry={latest.entry} />
          }
        })}
      </ol>
    </RuledSection>
  )
}
