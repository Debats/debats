import Link from 'next/link'
import ShareStrip from '../../components/charts/ShareStrip'
import ActionLink from '../../components/ui/ActionLink'
import { debateShares } from '../../domain/read-models/home-debates'
import { DailySubject as DailySubjectDetail } from '../../domain/read-models/home-page'
import { subjectHref } from '../../domain/read-models/hrefs'
import { positionAuthors } from '../../domain/read-models/subject-positions-summary'
import { plural } from '../../lib/plural'
import FacingQuote from './FacingQuote'
import PositionVoices from './PositionVoices'
import styles from './DailySubject.module.css'

/**
 * Le sujet du jour, en une : sa problématique, comment les voix se
 * répartissent entre ses positions, qui les porte, et les dernières paroles
 * dites pour les deux positions les plus soutenues, face à face.
 */
export default function DailySubject({ daily }: { daily: DailySubjectDetail }) {
  const { debate, positions, quotes } = daily
  const shares = debateShares(debate)
  const href = subjectHref(debate.slug)
  const facesOf = (positionId: string) => {
    const position = positions.find((summary) => summary.positionId === positionId)
    return position ? positionAuthors(position) : []
  }

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <p className={styles.kicker}>Le sujet du jour</p>
        <h2 className={styles.title}>
          <Link href={href} className={styles.titleLink}>
            {debate.title}
          </Link>
        </h2>
        <p className={styles.problem}>{debate.problem}</p>
      </header>

      <div className={styles.spread}>
        <p className={styles.count}>
          <strong>{debate.voices} voix</strong> se sont exprimées, sur {shares.length}{' '}
          {plural(shares.length, 'position', 'positions')}
        </p>
        <ShareStrip shares={shares} size="medium" />
        <ul className={styles.positions}>
          {shares.map((share, rank) => (
            <PositionVoices
              key={share.key}
              rank={rank}
              share={share}
              subjectSlug={debate.slug}
              authors={facesOf(share.key)}
            />
          ))}
        </ul>
      </div>

      {quotes.length > 0 && (
        <div className={styles.quotes}>
          {quotes.map((quoted) => (
            <FacingQuote key={quoted.statement.id} quoted={quoted} subjectSlug={debate.slug} />
          ))}
        </div>
      )}

      <p>
        <ActionLink href={href}>Lire les {debate.statementsCount} prises de position →</ActionLink>
      </p>
    </section>
  )
}
