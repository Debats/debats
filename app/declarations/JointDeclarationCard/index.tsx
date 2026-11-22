import Link from 'next/link'
import AuthorAvatarStack from '../../../components/statements/AuthorAvatarStack'
import { jointDeclarationHref, subjectHref } from '../../../domain/read-models/hrefs'
import {
  JointDeclarationSummary,
  signatoriesLabel,
} from '../../../domain/read-models/joint-declaration'
import { formatShortDate } from '../../../lib/format-date'
import styles from './JointDeclarationCard.module.css'

interface JointDeclarationCardProps {
  declaration: JointDeclarationSummary
}

/** Une déclaration commune dans l'index : sa date, son titre, les sujets qu'elle engage, qui la signe. */
export default function JointDeclarationCard({ declaration }: JointDeclarationCardProps) {
  const href = jointDeclarationHref(declaration)

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <span className={styles.date}>{formatShortDate(declaration.declaredAt)}</span>
        <h3 className={styles.title}>
          <Link href={href} className={styles.titleLink}>
            {declaration.title}
          </Link>
        </h3>
        {declaration.presentation && (
          <p className={styles.presentation}>{declaration.presentation}</p>
        )}
      </div>

      {declaration.subjects.length > 0 && (
        <ul className={styles.subjects}>
          {declaration.subjects.map((subject) => (
            <li key={subject.slug}>
              <Link href={subjectHref(subject.slug)} className={styles.subject}>
                {subject.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.signatories}>
        <AuthorAvatarStack authors={declaration.signatories} max={5} size={32} moreHref={href} />
        <span className={styles.count}>{signatoriesLabel(declaration.signatories)}</span>
      </div>
    </article>
  )
}
