import { Fragment } from 'react'
import Link from 'next/link'
import { listSeparator } from '../../../domain/read-models/feed-entries'
import {
  authorHref,
  authorOnSubjectHref,
  StatementAuthorRef,
} from '../../../domain/read-models/statement-author'
import { StatementWithAuthorAndSubject } from '../../../domain/repositories/statement-repository'

interface TookTogetherProps {
  author: StatementAuthorRef
  /** Ce qu'elle ou il a dit ou fait ce jour-là, dans l'ordre où le lister */
  entries: StatementWithAuthorAndSubject[]
  /** Le style du nom, puis celui des positions, propres à la liste qui écrit la phrase */
  nameClassName?: string
  positionClassName?: string
}

/**
 * La phrase de ce qu'un·e auteur·rice a dit ou fait le même jour : « Alma a
 * pris position pour A, B et C ». Le nom mène à sa page, chaque position à ce
 * qu'elle ou il en dit sur son sujet. Une position prise deux fois ce jour-là
 * n'est nommée qu'une fois.
 */
export default function TookTogether({
  author,
  entries,
  nameClassName,
  positionClassName,
}: TookTogetherProps) {
  const taken = entries.filter(
    (entry, index) => entries.findIndex((e) => e.position.id === entry.position.id) === index,
  )

  return (
    <>
      <Link href={authorHref(author)} className={nameClassName}>
        {author.name}
      </Link>{' '}
      a pris position pour{' '}
      {taken.map(({ position, subject }, index) => (
        <Fragment key={position.id}>
          {listSeparator(index, taken.length)}
          <Link href={authorOnSubjectHref(author, subject.slug)} className={positionClassName}>
            {position.title}
          </Link>
        </Fragment>
      ))}
    </>
  )
}
