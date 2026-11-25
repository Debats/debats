import { Fragment } from 'react'
import Link from 'next/link'
import { JointDeclarationRef } from '../../../domain/entities/joint-declaration'
import { nameSeparator, signedTail } from '../../../domain/read-models/gathered-signatures'
import { jointDeclarationHref } from '../../../domain/read-models/hrefs'
import { authorHref, StatementAuthorRef } from '../../../domain/read-models/statement-author'

interface SignedTogetherProps {
  declaration: JointDeclarationRef
  /** Les signataires nommé·es, dans l'ordre où les nommer */
  named: StatementAuthorRef[]
  /** Combien d'autres ont signé le texte */
  others: number
  /** Le style des noms, puis celui du titre du texte, propres à la liste qui écrit la phrase */
  nameClassName?: string
  titleClassName?: string
}

/**
 * La phrase d'un texte signé à plusieurs : « Alma, Boris, Chloé et 41 autres
 * ont signé » le texte. Chaque nom mène à sa page, le titre à celle du texte.
 */
export default function SignedTogether({
  declaration,
  named,
  others,
  nameClassName,
  titleClassName,
}: SignedTogetherProps) {
  return (
    <>
      {named.map((author, index) => (
        <Fragment key={author.id}>
          {nameSeparator(index, named.length, others)}
          <Link href={authorHref(author)} className={nameClassName}>
            {author.name}
          </Link>
        </Fragment>
      ))}
      {signedTail(named.length, others)}{' '}
      <Link href={jointDeclarationHref(declaration)} className={titleClassName}>
        {declaration.title}
      </Link>
    </>
  )
}
