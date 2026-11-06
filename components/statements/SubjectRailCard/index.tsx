import Link from 'next/link'
import ActionLink from '../../ui/ActionLink'
import { subjectHref } from '../../../domain/read-models/hrefs'
import { StatedSpan } from '../../../domain/repositories/statement-repository'
import { statedSpanLabel } from '../../../domain/services/subject-timeline'
import { plural } from '../../../lib/plural'
import styles from './SubjectRailCard.module.css'

interface SubjectRailCardProps {
  subject: { title: string; slug: string; problem: string }
  /** Les positions ouvertes, les voix recensées, la période couverte */
  facts: { positions: number; voices: number; span: StatedSpan | null }
}

/** Le sujet, sa problématique et les repères du débat, en tête du rail. */
export default function SubjectRailCard({ subject, facts }: SubjectRailCardProps) {
  const span = statedSpanLabel(facts.span)

  return (
    <div className={styles.card}>
      <p className={styles.title}>Le sujet</p>
      <Link href={subjectHref(subject.slug)} className={styles.name}>
        {subject.title}
      </Link>
      <p className={styles.problem}>{subject.problem}</p>

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
        {span && (
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Période couverte</dt>
            <dd className={styles.factValue}>{span}</dd>
          </div>
        )}
      </dl>

      <ActionLink href={subjectHref(subject.slug)} quiet>
        Voir toutes les positions
      </ActionLink>
      <ActionLink href={`${subjectHref(subject.slug)}/chronologie`} quiet>
        Chronologie du sujet
      </ActionLink>
    </div>
  )
}
