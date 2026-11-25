import { subjectHref } from '../../../domain/read-models/hrefs'
import { authorOnSubjectHref } from '../../../domain/read-models/statement-author'
import { StatementTouch } from '../../../domain/read-models/statement-feed'
import { StatementWithAuthorAndSubject } from '../../../domain/repositories/statement-repository'
import DatedStatement from '../DatedStatement'
import SignedDeclaration from '../SignedDeclaration'

interface FeedEntryProps {
  entry: StatementWithAuthorAndSubject
  /** Le métier ou la fonction de l'auteur·rice, quand la liste le connaît */
  role?: string
  /** Donné quand la liste se lit par dernière modification */
  touch?: StatementTouch
}

/**
 * Une entrée d'une liste de prises de position de tout le site : la signature
 * d'une déclaration commune se lit comme telle, toute autre prise de position
 * avec sa position et son sujet.
 */
export default function FeedEntry({ entry, role, touch }: FeedEntryProps) {
  const { statement, author, position, subject, arguments: used } = entry

  return statement.jointDeclaration ? (
    <SignedDeclaration
      author={author}
      role={role}
      declaration={statement.jointDeclaration}
      source={{
        name: statement.sourceName,
        url: statement.sourceUrl,
        statedAt: statement.statedAt,
      }}
      touch={touch}
    />
  ) : (
    <DatedStatement
      author={author}
      role={role}
      position={{ title: position.title, href: authorOnSubjectHref(author, subject.slug) }}
      subject={{ title: subject.title, href: subjectHref(subject.slug) }}
      statement={statement}
      touch={touch}
      arguments={used}
    />
  )
}
