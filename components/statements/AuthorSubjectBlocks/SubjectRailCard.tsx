import Link from 'next/link'
import { subjectHref } from '../../../domain/read-models/hrefs'
import { StatedSpan } from '../../../domain/repositories/statement-repository'
import { statedSpanLabel } from '../../../domain/services/subject-timeline'
import { plural } from '../../../lib/plural'
import styles from './AuthorSubjectBlocks.module.css'

interface SubjectRailCardProps {
  subject: { title: string; slug: string; problem: string }
  /** Les positions ouvertes, les voix recensées, la période couverte */
  facts: { positions: number; voices: number; span: StatedSpan | null }
}

/** Le sujet, sa problématique et les repères du débat, en tête du rail. */
export default function SubjectRailCard({ subject, facts }: SubjectRailCardProps) {
  return (
    <div className={styles.railCard}>
      <p className={styles.railCardTitle}>Le sujet</p>
      <Link href={subjectHref(subject.slug)} className={styles.subjectCardName}>
        {subject.title}
      </Link>
      <p className={styles.subjectCardProblem}>{subject.problem}</p>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt className={styles.factLabel}>
            {plural(facts.positions, 'Position ouverte', 'Positions ouvertes')}
          </dt>
          <dd className={styles.factValue}>{facts.positions}</dd>
        </div>
        <div className={styles.fact}>
          <dt className={styles.factLabel}>
            {plural(facts.voices, 'Voix recensée', 'Voix recensées')}
          </dt>
          <dd className={styles.factValue}>{facts.voices}</dd>
        </div>
        {statedSpanLabel(facts.span) && (
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Période couverte</dt>
            <dd className={styles.factValue}>{statedSpanLabel(facts.span)}</dd>
          </div>
        )}
      </dl>

      <Link href={subjectHref(subject.slug)} className={styles.railCardLink}>
        Voir toutes les positions
      </Link>
      <Link href={`${subjectHref(subject.slug)}/chronologie`} className={styles.railCardLink}>
        Chronologie du sujet
      </Link>
    </div>
  )
}
