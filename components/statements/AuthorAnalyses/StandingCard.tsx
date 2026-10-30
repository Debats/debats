import Link from 'next/link'
import ShowMore from '../../ui/ShowMore'
import {
  authorOnSubjectHref,
  StatementAuthorRef,
} from '../../../domain/read-models/statement-author'
import { Standing, SubjectStanding } from '../../../domain/services/author-analyses'
import { plural } from '../../../lib/plural'
import styles from './AuthorAnalyses.module.css'

interface StandingCardProps {
  standing: Standing
  /** The author the analysis is about: her subject pages are linked */
  author: StatementAuthorRef
  /** « cette personnalité », « cette organisation » */
  who: string
}

/** Subjects shown before the button that unfolds the rest */
const INITIAL_ROWS = 10

const badgeOf = (s: SubjectStanding) =>
  s.authors === 1
    ? { label: 'Seule voix', className: styles.badgeAlone }
    : s.withLeading
      ? { label: 'Position la plus soutenue', className: styles.badgeWith }
      : { label: 'Position minoritaire', className: styles.badgeApart }

/** Her positions, then how the subject stands: the leading one when it is not hers */
function detailOf(s: SubjectStanding): string {
  const mine = s.positions.map((p) => p.title).join(', ')
  if (s.authors === 1) return mine
  if (s.withLeading) return `${mine} · ${s.authors} voix sur le sujet`
  return `${mine} · la plus soutenue : ${s.leading.title} (${s.leading.authors} voix)`
}

/** Sur chaque sujet, l'auteur tient-il la position la plus soutenue ou une position minoritaire. */
export default function StandingCard({ standing, author, who }: StandingCardProps) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Face à l’ensemble</h3>
      <p className={styles.subtitle}>
        Sur chaque sujet, la position de {who} est-elle la plus soutenue par celles et ceux qui
        s’expriment, ou une position minoritaire ?
      </p>
      {standing.comparedCount > 0 && (
        <p className={styles.headline}>
          <span className={styles.number}>{standing.withLeadingCount}</span>
          <span className={styles.headlineText}>
            {plural(standing.withLeadingCount, 'sujet', 'sujets')} sur {standing.comparedCount} où{' '}
            {who} rejoint la position la plus soutenue
          </span>
        </p>
      )}
      {/* A div list: the « see more » button stands among the rows */}
      <div role="list" className={styles.rows}>
        <ShowMore
          initialCount={INITIAL_ROWS}
          moreLabel={`Voir les ${standing.subjects.length - INITIAL_ROWS} autres sujets`}
          items={standing.subjects.map((s) => {
            const badge = badgeOf(s)
            return (
              <div key={s.subject.id} role="listitem" className={styles.standingRow}>
                <div className={styles.rowBody}>
                  <Link
                    href={authorOnSubjectHref(author, s.subject.slug)}
                    className={styles.subject}
                  >
                    {s.subject.title}
                  </Link>
                  <span className={styles.meta}>{detailOf(s)}</span>
                </div>
                <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
              </div>
            )
          })}
        />
      </div>
    </section>
  )
}
