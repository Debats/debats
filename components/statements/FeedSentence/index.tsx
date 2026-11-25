import { FeedEntry } from '../../../domain/read-models/feed-entries'
import SignedTogether from '../SignedTogether'
import TookPosition from '../TookPosition'
import TookTogether from '../TookTogether'

interface FeedSentenceProps {
  entry: FeedEntry
  /** Le style des noms, puis celui de ce qui est pris ou signé, propres à la liste qui écrit la phrase */
  nameClassName?: string
  positionClassName?: string
}

/**
 * Ce qu'une entrée du flux dit, en une phrase : qui a pris quelle position,
 * qui a signé quel texte, ou ce qu'un·e auteur·rice a pris le même jour.
 * C'est ici, et seulement ici, qu'un rail choisit sa phrase selon l'entrée.
 */
export default function FeedSentence({
  entry,
  nameClassName,
  positionClassName,
}: FeedSentenceProps) {
  switch (entry.kind) {
    case 'signatures':
      return (
        <SignedTogether
          declaration={entry.declaration}
          named={entry.named}
          others={entry.others}
          nameClassName={nameClassName}
          titleClassName={positionClassName}
        />
      )
    case 'sameDay':
      return (
        <TookTogether
          author={entry.author}
          entries={entry.entries}
          others={entry.others}
          nameClassName={nameClassName}
          positionClassName={positionClassName}
        />
      )
    case 'statement':
      return (
        <TookPosition
          entry={entry.entry}
          nameClassName={nameClassName}
          positionClassName={positionClassName}
        />
      )
  }
}
