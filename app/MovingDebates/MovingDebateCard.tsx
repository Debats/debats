import Link from 'next/link'
import ShareStrip from '../../components/charts/ShareStrip'
import AuthorAvatarStack from '../../components/statements/AuthorAvatarStack'
import { debateShares, leadOf } from '../../domain/read-models/home-debates'
import { MovingDebate } from '../../domain/read-models/home-page'
import { subjectHref } from '../../domain/read-models/hrefs'
import { plural } from '../../lib/plural'
import styles from './MovingDebates.module.css'

/**
 * Un débat qui bouge : ce qui vient d'y être ajouté, son titre, sa barre, la
 * position en tête, ses visages. La carte entière mène au sujet, donc la pile
 * de visages n'est pas liée : HTML interdit un lien dans un lien.
 */
export default function MovingDebateCard({ moving }: { moving: MovingDebate }) {
  const { debate, faces } = moving
  const shares = debateShares(debate)
  const lead = leadOf(debate)

  return (
    <li>
      <Link href={subjectHref(debate.slug)} className={styles.card}>
        <span className={styles.recent}>+{debate.recentStatementsCount} cette semaine</span>
        <span className={styles.title}>{debate.title}</span>
        <ShareStrip shares={shares} size="thin" />
        {/* With a single position taken, nothing leads: there is nobody to be ahead of */}
        {lead && shares.length > 1 && (
          <span className={styles.lead}>
            {lead.tied > 1 ? 'À égalité en tête' : 'En tête'} : {lead.position.title}
          </span>
        )}
        <span className={styles.foot}>
          <AuthorAvatarStack
            authors={faces}
            totalCount={debate.voices}
            max={5}
            size={28}
            linked={false}
          />
          <span className={styles.meta}>
            {debate.voices} voix · {shares.length} {plural(shares.length, 'position', 'positions')}
          </span>
        </span>
      </Link>
    </li>
  )
}
