import RuledSection from '../../components/layout/RuledSection'
import { LatestEntry } from '../../domain/read-models/home-page'
import { STATEMENTS_HREF } from '../../domain/read-models/hrefs'
import SignedQuote from './SignedQuote'
import StatedQuote from './StatedQuote'
import styles from './LatestQuotes.module.css'

/**
 * Les dernières prises de position du site, dans le rail de l'accueil : ce
 * que chacun·e a dit ou fait, et les textes signés à plusieurs, une entrée
 * par texte.
 */
export default function LatestQuotes({ entries }: { entries: LatestEntry[] }) {
  if (entries.length === 0) return null

  return (
    <RuledSection
      title="Dernières prises de position"
      more={{ href: STATEMENTS_HREF, label: 'Tout le flux' }}
    >
      <ol className={styles.list}>
        {entries.map((latest) =>
          latest.kind === 'signatures' ? (
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
          ) : (
            <StatedQuote key={latest.entry.statement.id} entry={latest.entry} />
          ),
        )}
      </ol>
    </RuledSection>
  )
}
