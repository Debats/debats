import Link from 'next/link'
import AuthorAvatar from '../AuthorAvatar'
import { authorHref } from '../../../domain/read-models/statement-author'
import { Companion } from '../../../domain/services/author-analyses'
import { plural } from '../../../lib/plural'
import styles from './AuthorAnalyses.module.css'

interface CompanionRowProps {
  companion: Companion
  /** The row counts the subjects where they stand apart, instead of together */
  apart: boolean
}

/** Un·e auteur·e rencontré·e sur les sujets de l'auteur, et sur combien ils sont d'accord. */
export default function CompanionRow({ companion, apart }: CompanionRowProps) {
  const { author, agreed, disagreed } = companion
  const total = agreed + disagreed
  return (
    <li className={styles.companion}>
      <AuthorAvatar author={author} size={32} />
      <div className={styles.companionBody}>
        <Link href={authorHref(author)} className={styles.name}>
          {author.name}
        </Link>
        <span className={styles.meta}>
          {apart ? 'autre position' : 'même position'} sur {apart ? disagreed : agreed}{' '}
          {plural(total, 'sujet', 'sujets')} sur {total}
        </span>
      </div>
    </li>
  )
}
