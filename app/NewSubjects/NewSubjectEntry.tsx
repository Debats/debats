import Link from 'next/link'
import ActionLink from '../../components/ui/ActionLink'
import { Debate } from '../../domain/read-models/home-debates'
import { addStatementHref, subjectHref } from '../../domain/read-models/hrefs'
import { formatShortDate } from '../../lib/format-date'
import { subjectInvitation } from './subject-invitation'
import styles from './NewSubjects.module.css'

interface NewSubjectEntryProps {
  subject: Debate
  /** Une personne connectée arrive sur le formulaire, une autre sur la page qui explique comment contribuer */
  signedIn: boolean
}

/**
 * Un sujet tout juste ouvert : sa thématique et le jour de son ouverture, son
 * titre et la question qu'il pose, qui mènent au sujet ; puis où il en est, et
 * l'invitation à y ajouter une prise de position.
 */
export default function NewSubjectEntry({ subject, signedIn }: NewSubjectEntryProps) {
  const { standing, call } = subjectInvitation(subject)

  return (
    <li className={styles.entry}>
      <Link href={subjectHref(subject.slug)} className={styles.link}>
        <span className={styles.meta}>
          {subject.theme && <span className={styles.theme}>{subject.theme.name}</span>}
          <span className={styles.date}>{formatShortDate(subject.createdAt)}</span>
        </span>
        <span className={styles.title}>{subject.title}</span>
        <span className={styles.problem}>{subject.problem}</span>
      </Link>
      <p className={styles.invitation}>
        <span className={styles.standing}>{standing}</span>
        <ActionLink href={addStatementHref(subject, signedIn)}>{call} →</ActionLink>
      </p>
    </li>
  )
}
