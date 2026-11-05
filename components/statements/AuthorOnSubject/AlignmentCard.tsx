import AlignmentChart from '../../charts/AlignmentChart'
import StackedShareBar from '../../charts/StackedShareBar'
import { PositionStanding } from '../../../domain/services/author-on-subject'
import { SubjectAlignment } from '../../../domain/services/group-alignment'
import { plural } from '../../../lib/plural'
import analysis from '../../../styles/analysis.module.css'
import styles from './AuthorOnSubject.module.css'

interface AlignmentCardProps {
  debate: PositionStanding[]
  alignment: SubjectAlignment
  /** « cette personnalité », « cette organisation » */
  who: string
}

/**
 * Où se situe la position de l'auteur : la barre des voix du sujet, puis
 * l'écart entre lui et chaque groupe auquel il appartient. La seconde
 * carte n'apparaît que lorsqu'il y a quelqu'un à comparer.
 */
export default function AlignmentCard({ debate, alignment, who }: AlignmentCardProps) {
  const voices = debate.reduce((sum, standing) => sum + standing.authors.length, 0)
  if (voices === 0) return null

  const { everyone, rows } = alignment
  const shares = debate.map((standing) => ({
    key: standing.position.id,
    label: standing.position.title,
    count: standing.authors.length,
  }))

  return (
    <section className={analysis.card}>
      <h2 className={analysis.cardTitle}>Où se situe cette position</h2>
      <p className={analysis.cardSubtitle}>
        Comment les voix du sujet se répartissent entre les positions, et qui suit {who}.
      </p>

      <p className={analysis.headline}>
        <span className={analysis.headlineNumber}>{everyone.withAuthor}</span>
        <span className={analysis.headlineText}>
          {plural(everyone.withAuthor, 'autre voix défend', 'autres voix défendent')} la même
          position, sur {everyone.total} {plural(everyone.total, 'recensée', 'recensées')} sur ce
          sujet
        </span>
      </p>

      <ul className={styles.legend} aria-label="Positions">
        {debate.map((standing, index) => (
          <li key={standing.position.id} className={styles.legendItem}>
            <span aria-hidden="true" className={`${styles.swatch} ${shadeOf(index)}`} />
            {standing.position.title}
            {standing.hers && <span className={styles.legendMine}>sa position</span>}
          </li>
        ))}
      </ul>
      <StackedShareBar shares={shares} label="Toutes les voix du sujet" />

      {rows.length > 0 ? (
        <>
          <h3 className={styles.subTitle}>Avec qui est-il raccord</h3>
          <AlignmentChart alignment={alignment} who={who} />
        </>
      ) : (
        <p className={analysis.cardEmpty}>
          Aucun membre de ses organisations ni aucune personnalité de ses métiers ne s’est encore
          exprimé sur ce sujet : il n’y a personne à qui le comparer.
        </p>
      )}
    </section>
  )
}

/** Les mêmes nuances que la barre, pour la légende */
const shadeOf = (index: number) => analysis[`shade${Math.min(index, 5)}`]
