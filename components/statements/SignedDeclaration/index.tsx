import Link from 'next/link'
import { JointDeclarationRef } from '../../../domain/entities/joint-declaration'
import { jointDeclarationHref } from '../../../domain/read-models/hrefs'
import { provenanceOfText } from '../../../domain/read-models/statement-provenance'
import { authorHref, StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { StatementTouch } from '../../../domain/read-models/statement-feed'
import { formatShortDate } from '../../../lib/format-date'
import AuthorAvatar from '../AuthorAvatar'
import ProvenanceLine from '../ProvenanceLine'
import styles from './SignedDeclaration.module.css'

interface SignedDeclarationProps {
  author: StatementAuthorRef
  /** What the author is today, named beside her as in the other entries of the list */
  role?: string
  declaration: JointDeclarationRef
  /** The source and the day of the text, which are those of every signature */
  source: { name: string; url: string; statedAt: Date }
  /** Given when the list is read by last touch: says why the entry stands where it does */
  touch?: StatementTouch
}

const TOUCH_LABELS: Record<StatementTouch['kind'], string> = {
  added: 'ajoutée le',
  edited: 'modifiée le',
}

/**
 * La signature d'une déclaration commune dans une liste datée : qui a signé
 * quel texte. Une seule entrée par signataire, quel que soit le nombre de
 * positions que prend le texte : elles se lisent sur sa page.
 */
export default function SignedDeclaration({
  author,
  role,
  declaration,
  source,
  touch,
}: SignedDeclarationProps) {
  return (
    <article className={styles.entry}>
      <AuthorAvatar author={author} size={44} />
      <div className={styles.body}>
        <p className={styles.head}>
          <Link href={authorHref(author)} className={styles.name}>
            {author.name}
          </Link>
          {role && <span className={styles.role}>{role}</span>}
        </p>
        <p className={styles.signed}>
          a signé{' '}
          <Link href={jointDeclarationHref(declaration)} className={styles.declaration}>
            {declaration.title}
          </Link>
        </p>
        <ProvenanceLine
          provenance={provenanceOfText(source)}
          notes={[
            <span key="day" className={styles.date}>
              {formatShortDate(source.statedAt)}
            </span>,
            ...(touch
              ? [
                  <span key="touch" className={styles.date}>
                    {TOUCH_LABELS[touch.kind]} {formatShortDate(touch.at)}
                  </span>,
                ]
              : []),
          ]}
        />
      </div>
    </article>
  )
}
