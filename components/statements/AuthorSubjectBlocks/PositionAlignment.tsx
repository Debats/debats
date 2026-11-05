import AlignmentChart from '../../charts/AlignmentChart'
import ShareBar from '../../charts/ShareBar'
import ShareLegend from '../../charts/ShareLegend'
import { PositionShare, PositionStanding } from '../../../domain/services/author-on-subject'
import { SubjectAlignment } from '../../../domain/services/group-alignment'
import { plural } from '../../../lib/plural'
import analysis from '../../../styles/analysis.module.css'
import styles from './AuthorSubjectBlocks.module.css'

/** Le nom de la ligne de référence, partout où le graphique la nomme */
const EVERYONE = 'Toutes les voix du sujet'

interface PositionAlignmentProps {
  /** Toutes les positions du sujet, de la plus à la moins soutenue */
  debate: PositionStanding[]
  /** La part de chacune parmi les voix comptées, calculée par le domaine */
  shares: PositionShare[]
  alignment: SubjectAlignment
  /**
   * Ce qu'on dit quand il n'y a personne à comparer. Le texte vient de la
   * page, qui seule sait de quels groupes il s'agit — et si le site en
   * connaît.
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
  shares,
  alignment,
  nobodyToCompare,
}: PositionAlignmentProps) {
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
        shares={shares.map((share) => ({
          key: share.position.id,
          label: share.position.title,
          count: share.count,
          share: share.share,
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
