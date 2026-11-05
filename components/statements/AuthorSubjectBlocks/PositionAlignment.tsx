import AlignmentChart from '../../charts/AlignmentChart'
import ShareBar from '../../charts/ShareBar'
import ShareLegend from '../../charts/ShareLegend'
import { PositionStanding } from '../../../domain/services/author-on-subject'
import { SubjectAlignment } from '../../../domain/services/group-alignment'
import { plural } from '../../../lib/plural'
import analysis from '../../../styles/analysis.module.css'
import styles from './AuthorSubjectBlocks.module.css'

/** Le nom de la ligne de référence, partout où le graphique la nomme */
const EVERYONE = 'Toutes les voix du sujet'

interface PositionAlignmentProps {
  debate: PositionStanding[]
  alignment: SubjectAlignment
  /** Les voix distinctes du sujet, l'auteur compris */
  voices: number
  /**
   * Ce qu'on dit quand aucun groupe n'a de quoi parler. Le texte vient de la
   * page : une personnalité se compare à ses organisations et à ses métiers,
   * une organisation à ses propres membres.
   */
  nobodyToCompare: React.ReactNode
}

/**
 * Où se situe la position de l'auteur : la barre des voix du sujet, puis
 * l'écart entre lui et chaque groupe auquel il appartient. Le graphique
 * n'apparaît que lorsqu'il y a quelqu'un à comparer.
 *
 * Rien ici ne s'accorde en genre : l'auteur est aussi bien une organisation
 * qu'une personnalité, et le site écrit de façon inclusive. Les phrases
 * prennent donc la position pour sujet, pas la personne.
 */
export default function PositionAlignment({
  debate,
  alignment,
  voices,
  nobodyToCompare,
}: PositionAlignmentProps) {
  if (voices === 0) return null

  const { everyone, rows } = alignment

  return (
    <section className={styles.alignmentCard}>
      <h2 className={analysis.cardTitle}>Où se situe cette position</h2>
      <p className={analysis.cardSubtitle}>
        Comment les voix du sujet se répartissent entre les positions, et qui défend la même.
      </p>

      <p className={analysis.headline}>
        <span className={analysis.headlineNumber}>{everyone.withAuthor}</span>
        <span className={analysis.headlineText}>
          {plural(everyone.withAuthor, 'autre voix défend', 'autres voix défendent')} la même
          position, sur {everyone.total}{' '}
          {plural(everyone.total, 'autre voix recensée', 'autres voix recensées')} sur ce sujet
        </span>
      </p>

      <ShareLegend
        items={debate.map((standing) => ({
          key: standing.position.id,
          label: standing.position.title,
          note: standing.hers ? 'position défendue' : undefined,
        }))}
      />
      <ShareBar
        label={EVERYONE}
        shares={debate.map((standing) => ({
          key: standing.position.id,
          label: standing.position.title,
          count: standing.authors.length,
        }))}
      />

      {rows.length > 0 ? (
        <>
          <h3 className={styles.subTitle}>Qui suit cette position, groupe par groupe</h3>
          <AlignmentChart
            alignment={alignment}
            referenceLabel={EVERYONE}
            caveat={
              <>
                Chaque barre est l’intervalle dans lequel la part du groupe se tient vraiment, vu le
                nombre de personnes qu’il compte. Tant qu’elle traverse le trait de l’ensemble,
                l’écart ne conclut rien : la pastille reste creuse. Ces parts portent sur les
                personnes recensées sur Débats.co, pas sur un échantillon représentatif.
              </>
            }
          />
        </>
      ) : (
        <p className={analysis.cardEmpty}>{nobodyToCompare}</p>
      )}
    </section>
  )
}
