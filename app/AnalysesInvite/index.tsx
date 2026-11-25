import ActionLink from '../../components/ui/ActionLink'
import { ANALYSES_HREF } from '../../domain/read-models/hrefs'
import styles from './AnalysesInvite.module.css'

/**
 * L'invitation aux analyses, au pied de l'accueil : ce que le site compare
 * d'un sujet, d'une personnalité ou d'une organisation à l'autre se lit sur
 * une page à part.
 */
export default function AnalysesInvite() {
  return (
    <section className={styles.invite}>
      <p className={styles.kicker}>Aller plus loin</p>
      <h2 className={styles.title}>Les analyses</h2>
      <p className={styles.text}>
        Les sujets partagés et les sujets tranchés, qui pense comme qui, qui a changé de position,
        les partis et leurs membres.
      </p>
      <ActionLink href={ANALYSES_HREF}>Ouvrir les analyses →</ActionLink>
    </section>
  )
}
