import Link from 'next/link'
import FigureAvatar from '../../../../components/figures/FigureAvatar'
import FigureAvatarStack from '../../../../components/figures/FigureAvatarStack'
import ComingSoon from '../../../../components/ui/ComingSoon'
import { STATEMENT_TYPE_LABELS } from '../../../../domain/entities/statement'
import {
  PositionLatestStatement,
  PositionSummary,
} from '../../../../domain/read-models/subject-positions-summary'
import { formatShortDate } from '../../../../lib/format-date'
import { positionAnchor } from '../position-anchor'
import styles from './PositionCard.module.css'

interface PositionCardProps {
  position: PositionSummary
  subjectSlug: string
  /** La position la plus soutenue du sujet */
  featured?: boolean
}

function FeaturedStatement({
  statement,
  subjectSlug,
  positionHref,
  othersCount,
}: {
  statement: PositionLatestStatement
  subjectSlug: string
  positionHref: string
  othersCount: number
}) {
  return (
    <div className={styles.statement}>
      <FigureAvatar slug={statement.figure.slug} name={statement.figure.name} size={44} />
      <div className={styles.statementBody}>
        <div className={styles.statementHead}>
          <Link href={`/p/${statement.figure.slug}/s/${subjectSlug}`} className={styles.figure}>
            {statement.figure.name}
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
          {othersCount > 0 && (
            <>
              <span className={styles.separator}>·</span>
              <Link href={positionHref} className={styles.more}>
                {othersCount === 1 ? '1 autre personnalité' : `${othersCount} autres personnalités`}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PositionCard({ position, subjectSlug, featured }: PositionCardProps) {
  const count = position.totalFiguresCount
  const positionHref = `/s/${subjectSlug}/position/${position.positionSlug}`

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
          <span className={styles.countLabel}>{count === 1 ? '1 pers.' : `${count} pers.`}</span>
        </p>
      </div>

      <p className={styles.description}>{position.positionDescription}</p>

      <div className={styles.rule} />

      <div className={styles.people}>
        <FigureAvatarStack
          figures={position.figures}
          totalCount={count}
          max={10}
          size={36}
          hrefSuffix={`/s/${subjectSlug}`}
        />
        <ComingSoon>
          <span className={styles.chip}>Arguments mobilisés</span>
        </ComingSoon>
      </div>

      {position.latestStatement && (
        <>
          <div className={styles.rule} />
          <FeaturedStatement
            statement={position.latestStatement}
            subjectSlug={subjectSlug}
            positionHref={positionHref}
            othersCount={count - 1}
          />
        </>
      )}
    </article>
  )
}
