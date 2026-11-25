import Link from 'next/link'
import { subjectHref } from '../../../domain/read-models/hrefs'
import { authorHref, authorOnSubjectHref } from '../../../domain/read-models/statement-author'
import { StatementWithAuthorAndSubject } from '../../../domain/repositories/statement-repository'

interface TookPositionProps {
  entry: StatementWithAuthorAndSubject
  /** Le style du nom et du sujet, puis celui de la position, propres à la liste qui écrit la phrase */
  nameClassName?: string
  positionClassName?: string
}

/**
 * La phrase d'une prise de position : « Alma s'est déclarée pour telle
 * position dans le débat tel sujet ». Le nom mène à sa page, la position à ce
 * qu'elle ou il en dit, le sujet au débat.
 */
export default function TookPosition({
  entry: { author, position, subject },
  nameClassName,
  positionClassName,
}: TookPositionProps) {
  return (
    <>
      <Link href={authorHref(author)} className={nameClassName}>
        {author.name}
      </Link>{' '}
      {author.kind === 'organisation' ? 'a pris position pour' : 's’est déclaré·e pour'}{' '}
      <Link href={authorOnSubjectHref(author, subject.slug)} className={positionClassName}>
        {position.title}
      </Link>{' '}
      dans le débat{' '}
      <Link href={subjectHref(subject.slug)} className={nameClassName}>
        {subject.title}
      </Link>
    </>
  )
}
