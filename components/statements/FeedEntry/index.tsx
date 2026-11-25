import { roleOf } from '../../../domain/read-models/author-role'
import { FeedEntry as Entry } from '../../../domain/read-models/feed-entries'
import { StatementTouch } from '../../../domain/read-models/statement-feed'
import { StatementWithAuthorAndSubject } from '../../../domain/repositories/statement-repository'
import FeedStatement from '../FeedStatement'
import SignedByMany from '../SignedByMany'

interface FeedEntryProps {
  entry: Entry
  /** Les métiers et fonctions des personnalités de la liste, quand elle les connaît */
  roles?: Map<string, string>
  /** Donné quand la liste se lit par dernière modification : ce qui a touché chaque prise de position */
  touchOf?: (entry: StatementWithAuthorAndSubject) => StatementTouch
}

/**
 * Une entrée du flux, dans la page qui le liste en entier. Les signatures
 * d'un texte tiennent en une ligne ; ce qu'un·e auteur·rice a dit ou fait le
 * même jour reste détaillé, chaque prise de position avec sa source et ce
 * qui permet de la relire.
 */
export default function FeedEntry({ entry, roles, touchOf }: FeedEntryProps) {
  if (entry.kind === 'signatures') {
    const { statement } = entry.first
    return (
      <SignedByMany
        declaration={entry.declaration}
        source={{
          name: statement.sourceName,
          url: statement.sourceUrl,
          statedAt: statement.statedAt,
        }}
        named={entry.named}
        others={entry.others}
      />
    )
  }

  const statements = entry.kind === 'sameDay' ? entry.entries : [entry.entry]
  return (
    <>
      {statements.map((stated) => (
        <FeedStatement
          key={stated.statement.id}
          entry={stated}
          role={roles && roleOf(stated.author, roles)}
          touch={touchOf?.(stated)}
        />
      ))}
    </>
  )
}
