import Link from 'next/link'
import AuthorAvatar from '../../../../components/statements/AuthorAvatar'
import AuthorAvatarStack from '../../../../components/statements/AuthorAvatarStack'
import ArgumentChips from '../../../../components/statements/ArgumentChips'
import { STATEMENT_TYPE_LABELS } from '../../../../domain/entities/statement'
import { ArgumentRef } from '../../../../domain/read-models/argument'
import { authorOnSubjectHref } from '../../../../domain/read-models/statement-author'
import {
  positionAuthors,
  positionAuthorsCount,
  PositionLatestStatement,
  PositionSummary,
} from '../../../../domain/read-models/subject-positions-summary'
import { formatShortDate } from '../../../../lib/format-date'
import { plural } from '../../../../lib/plural'
import { positionAnchor } from '../position-anchor'
import styles from './PositionCard.module.css'

interface PositionCardProps {
  position: PositionSummary
  subjectSlug: string
  /** Les arguments que les prises de position de cette position mobilisent */
  arguments: ArgumentRef[]
  /** La position la plus soutenue du sujet */
  featured?: boolean
}

/** « 6 pers. », « 2 org. » ou « 6 pers. · 2 org. » */
function authorsLabel(position: PositionSummary): string {
  return [
    position.totalFiguresCount > 0 ? `${position.totalFiguresCount} pers.` : null,
    position.totalOrganisationsCount > 0 ? `${position.totalOrganisationsCount} org.` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Lien vers les autres auteurs de la position, nommés selon ce qu'ils sont */
function othersLabel(position: PositionSummary, others: number): string {
  const mixed = position.totalOrganisationsCount > 0 && position.totalFiguresCount > 0
  if (mixed) return `${others} ${plural(others, 'autre acteur', 'autres acteurs')}`
  if (position.totalOrganisationsCount > 0) {
    return `${others} ${plural(others, 'autre organisation', 'autres organisations')}`
  }
  return `${others} ${plural(others, 'autre personnalité', 'autres personnalités')}`
}

function FeaturedStatement({
  statement,
  subjectSlug,
  positionHref,
  othersLabel,
}: {
  statement: PositionLatestStatement
  subjectSlug: string
  positionHref: string
  othersLabel: string | null
}) {
  return (
    <div className={styles.statement}>
      <AuthorAvatar author={statement.author} size={44} />
      <div className={styles.statementBody}>
        <div className={styles.statementHead}>
          <Link href={authorOnSubjectHref(statement.author, subjectSlug)} className={styles.figure}>
            {statement.author.name}
          </Link>
          <span className={styles.date}>{formatShortDate(statement.statedAt)}</span>
        </div>
        <blockquote className={styles.quote}>{statement.quote}</blockquote>
        <div className={styles.source}>
          <span className={styles.type}>{STATEMENT_TYPE_LABELS[statement.statementType]}</span>
          {statement.sourceUrl ? (
            <a
              href={statement.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceLink}
            >
              {statement.sourceName}
            </a>
          ) : (
            <span className={styles.sourceLink}>{statement.sourceName}</span>
          )}
          {othersLabel && (
            <>
              <span className={styles.separator}>·</span>
              <Link href={positionHref} className={styles.more}>
                {othersLabel}
              </Link>
            </>
          )}
        </div>
        <ArgumentChips arguments={statement.arguments} />
      </div>
    </div>
  )
}

export default function PositionCard({
  position,
  subjectSlug,
  arguments: used,
  featured,
}: PositionCardProps) {
  const count = positionAuthorsCount(position)
  const positionHref = `/s/${subjectSlug}/position/${position.positionSlug}`
  const others = count - 1

  return (
    <article className={styles.card} id={positionAnchor(position.positionSlug)}>
      <div className={styles.head}>
        <div>
          {featured && <p className={styles.kicker}>La plus soutenue</p>}
          <h3 className={styles.title}>
            <Link href={positionHref} className={styles.titleLink}>
              {position.positionTitle}
            </Link>
          </h3>
        </div>
        <p className={styles.count}>
          <span className={styles.countValue}>{count}</span>
          <span className={styles.countLabel}>{authorsLabel(position) || 'personne'}</span>
        </p>
      </div>

      <p className={styles.description}>{position.positionDescription}</p>

      <div className={styles.rule} />

      <div className={styles.people}>
        <AuthorAvatarStack
          authors={positionAuthors(position)}
          totalCount={count}
          max={10}
          size={36}
          subjectSlug={subjectSlug}
          moreHref={positionHref}
        />
        {used.length > 0 ? (
          <ArgumentChips arguments={used} />
        ) : (
          <span className={styles.chip}>Aucun argument recensé</span>
        )}
      </div>

      {position.latestStatement && (
        <>
          <div className={styles.rule} />
          <FeaturedStatement
            statement={position.latestStatement}
            subjectSlug={subjectSlug}
            positionHref={positionHref}
            othersLabel={others > 0 ? othersLabel(position, others) : null}
          />
        </>
      )}
    </article>
  )
}
