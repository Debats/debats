import AlignmentChart from '../../charts/AlignmentChart'
import ShareBar from '../../charts/ShareBar'
import ShareLegend from '../../charts/ShareLegend'
import { PositionShare } from '../../../domain/services/author-on-subject'
import { SubjectAlignment } from '../../../domain/services/group-alignment'
import { plural } from '../../../lib/plural'
import styles from './PositionAlignment.module.css'

/** Le nom de la ligne de référence, partout où le graphique la nomme */
const EVERYONE = 'Toutes les voix du sujet'

interface PositionAlignmentProps {
  /**
   * Les positions du sujet avec leur part, de la plus à la moins soutenue,
   * calculées par le domaine. Une seule liste pour la légende et pour la
   * barre : toutes deux tirent leur nuance d'encre du rang, et deux listes
   * données séparément pourraient se désaccorder sans rien casser.
   */
  shares: PositionShare[]
  alignment: SubjectAlignment
  /**
   * L'invitation à renseigner les groupes de l'auteur, quand le site ne lui
   * en connaît aucun. Le texte vient de la page, qui seule sait de quels
   * groupes il s'agit. Absente quand il en a : des groupes trop peu entendus
   * pour être comparés ne se disent pas, la carte s'arrête à la barre.
   */
  noGroupKnown?: React.ReactNode
}

/**
 * Où se situe la position de l'auteur : la barre des voix du sujet, puis
 * l'écart entre lui et chaque groupe auquel il appartient. Le graphique
 * n'apparaît que pour les groupes assez entendus pour être comparés
 * (`COMPARABLE_FROM`) ; en dessous, rien n'est affiché.
 *
 * Rien ici ne s'accorde en genre : l'auteur est aussi bien une organisation
 * qu'une personnalité, et le site écrit de façon inclusive. Les phrases
 * prennent donc la position pour sujet, pas la personne.
 */
export default function PositionAlignment({
  shares,
  alignment,
  noGroupKnown,
}: PositionAlignmentProps) {
  const { everyone, rows } = alignment

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Où se situe cette position</h2>
      <p className={styles.subtitle}>
        Comment les voix du sujet se répartissent entre les positions, et qui défend la même.
      </p>

      <p className={styles.headline}>
        <span className={styles.headlineNumber}>{everyone.withAuthor}</span>
        <span className={styles.headlineText}>
          {plural(everyone.withAuthor, 'autre voix défend', 'autres voix défendent')} la même
          position, sur {everyone.total}{' '}
          {plural(everyone.total, 'autre voix recensée', 'autres voix recensées')} sur ce sujet
        </span>
      </p>

      <ShareLegend
        items={shares.map((share) => ({
          key: share.position.id,
          label: share.position.title,
          note: share.hers ? 'position défendue' : undefined,
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

      {rows.length > 0 && (
        <>
          <h3 className={styles.groupsTitle}>Qui suit cette position, groupe par groupe</h3>
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
      )}

      {noGroupKnown && <p className={styles.empty}>{noGroupKnown}</p>}
    </section>
  )
}
