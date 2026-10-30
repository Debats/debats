import Link from 'next/link'
import AuthorAvatar from '../AuthorAvatar'
import ShowMore from '../../ui/ShowMore'
import { STATEMENT_TYPE_LABELS } from '../../../domain/entities/statement'
import {
  authorHref,
  authorOnSubjectHref,
  StatementAuthorRef,
} from '../../../domain/read-models/statement-author'
import {
  AuthorAnalysis,
  Companion,
  Company,
  ExpressionProfile,
  PositionChange,
  PositionRef,
  Standing,
  SubjectStanding,
} from '../../../domain/services/author-analyses'
import { formatMonthYear } from '../../../lib/format-date'
import { plural } from '../../../lib/plural'
import styles from './AuthorAnalyses.module.css'

interface AuthorAnalysesProps {
  /** The author the analyses are about: her subject pages are linked */
  author: StatementAuthorRef
  /** « cette personnalité », « cette organisation » */
  who: string
  analysis: AuthorAnalysis
  /** A block of the page's own, shown after who she stands with */
  children?: React.ReactNode
}

const subjectsLabel = (count: number) => `${count} ${plural(count, 'sujet', 'sujets')}`
const titles = (positions: PositionRef[]) => positions.map((p) => p.title).join(', ')

function CompanionRow({ companion, apart }: { companion: Companion; apart: boolean }) {
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

function CompanionsColumn({
  title,
  companions,
  apart,
}: {
  title: string
  companions: Companion[]
  apart: boolean
}) {
  return (
    <div>
      <h4 className={styles.columnTitle}>{title}</h4>
      {companions.length === 0 ? (
        <p className={styles.empty}>Personne, pour l’instant.</p>
      ) : (
        <ul className={styles.companions}>
          {companions.map((c) => (
            <CompanionRow key={`${c.author.kind}-${c.author.id}`} companion={c} apart={apart} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Who stands with the author the most often, and who stands apart the most often */
function CompanyCard({ company, who }: { company: Company; who: string }) {
  const nobody = company.closest.length === 0 && company.opposed.length === 0
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Qui pense comme {who}, qui pense autrement</h3>
      <p className={styles.subtitle}>
        Sur les sujets où {who} s’est exprimée, celles et ceux qui prennent le plus souvent la même
        position, et le plus souvent une autre.
      </p>
      {nobody ? (
        <p className={styles.empty}>Personne d’autre ne s’est encore exprimé sur ses sujets.</p>
      ) : (
        <div className={styles.columns}>
          <CompanionsColumn
            title="Le plus souvent du même avis"
            companions={company.closest}
            apart={false}
          />
          <CompanionsColumn
            title="Le plus souvent d’un autre avis"
            companions={company.opposed}
            apart
          />
        </div>
      )}
    </section>
  )
}

/** Subjects shown before the button that unfolds the rest */
const INITIAL_STANDING_ROWS = 10

const standingBadge = (s: SubjectStanding) =>
  s.authors === 1
    ? { label: 'Seule voix', className: styles.badgeAlone }
    : s.withLeading
      ? { label: 'Position la plus soutenue', className: styles.badgeWith }
      : { label: 'Position minoritaire', className: styles.badgeApart }

/** Her positions, then how the subject stands: the leading one when it is not hers */
function standingDetail(s: SubjectStanding): string {
  const mine = titles(s.positions)
  if (s.authors === 1) return mine
  if (s.withLeading) return `${mine} · ${s.authors} voix sur le sujet`
  return `${mine} · la plus soutenue : ${s.leading.title} (${s.leading.authors} voix)`
}

/** On each subject, whether the author stands with the most supported position */
function StandingCard({
  standing,
  author,
  who,
}: {
  standing: Standing
  author: StatementAuthorRef
  who: string
}) {
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
          initialCount={INITIAL_STANDING_ROWS}
          moreLabel={`Voir les ${standing.subjects.length - INITIAL_STANDING_ROWS} autres sujets`}
          items={standing.subjects.map((s) => {
            const badge = standingBadge(s)
            return (
              <div key={s.subject.id} role="listitem" className={styles.row}>
                <div className={styles.rowBody}>
                  <Link
                    href={authorOnSubjectHref(author, s.subject.slug)}
                    className={styles.subject}
                  >
                    {s.subject.title}
                  </Link>
                  <span className={styles.meta}>{standingDetail(s)}</span>
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

/** The subjects where the author moved from one position to another */
function ChangesCard({
  changes,
  author,
  who,
}: {
  changes: PositionChange[]
  author: StatementAuthorRef
  who: string
}) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Changements de position</h3>
      <p className={styles.subtitle}>
        Les sujets où {who} a pris plusieurs positions au fil du temps, dans l’ordre où elles ont
        été exprimées.
      </p>
      {changes.length === 0 ? (
        <p className={styles.empty}>Aucun changement de position recensé.</p>
      ) : (
        <ul className={styles.rows}>
          {changes.map((change) => (
            <li key={change.subject.id} className={styles.row}>
              <div className={styles.rowBody}>
                <Link
                  href={authorOnSubjectHref(author, change.subject.slug)}
                  className={styles.subject}
                >
                  {change.subject.title}
                </Link>
                <ol className={styles.steps}>
                  {change.steps.map((step, index) => (
                    <li key={`${step.position.id}-${index}`} className={styles.step}>
                      <span className={styles.stepPosition}>{step.position.title}</span>
                      <span className={styles.meta}>{formatMonthYear(step.statedAt)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Horizontal bars, the entries given most first: the first one sets the scale */
function Bars({ entries }: { entries: Array<{ key: string; label: string; count: number }> }) {
  const max = entries[0]?.count ?? 0
  return (
    <ul className={styles.bars}>
      {entries.map((entry) => (
        <li key={entry.key} className={styles.bar}>
          <span className={styles.barLabel}>{entry.label}</span>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${(entry.count / max) * 100}%` }} />
          </div>
          <span className={styles.barValue}>{entry.count}</span>
        </li>
      ))}
    </ul>
  )
}

/** By type of statement, and through which sources */
function ProfileCard({ profile, who }: { profile: ExpressionProfile; who: string }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Comment {who} s’exprime</h3>
      <p className={styles.subtitle}>
        Par quel type de prise de position, et dans quelles sources elle est le plus souvent citée.
      </p>
      <div className={styles.columns}>
        <div>
          <h4 className={styles.columnTitle}>Par type</h4>
          <Bars
            entries={profile.byType.map((t) => ({
              key: t.type,
              label: STATEMENT_TYPE_LABELS[t.type],
              count: t.count,
            }))}
          />
        </div>
        <div>
          <h4 className={styles.columnTitle}>Sources les plus citées</h4>
          <Bars
            entries={profile.sources.map((s) => ({ key: s.name, label: s.name, count: s.count }))}
          />
        </div>
      </div>
    </section>
  )
}

/** Onglet Analyses d'une personnalité ou d'une organisation : ses positions face aux autres. */
export default function AuthorAnalyses({ author, who, analysis, children }: AuthorAnalysesProps) {
  const { company, standing, changes, profile } = analysis
  // The standing lists every subject she spoke on: none means no statement at all
  if (standing.subjects.length === 0) {
    return (
      <p className={styles.none}>
        Les analyses apparaîtront avec les premières prises de position de {who}.
      </p>
    )
  }

  return (
    <div className={styles.analyses}>
      <CompanyCard company={company} who={who} />
      {children}
      <StandingCard standing={standing} author={author} who={who} />
      <ChangesCard changes={changes} author={author} who={who} />
      <ProfileCard profile={profile} who={who} />
      <p className={styles.note}>
        Sur un sujet, deux auteur·es sont du même avis quand ils ou elles partagent au moins une
        position ; {subjectsLabel(standing.subjects.length)}{' '}
        {plural(standing.subjects.length, 'est pris', 'sont pris')} en compte.
      </p>
    </div>
  )
}
