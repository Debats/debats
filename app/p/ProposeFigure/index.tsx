import Button from '../../../components/ui/Button'
import { CONTRIBUTE_HREF, FIGURES_HREF } from '../../../domain/read-models/hrefs'
import styles from './ProposeFigure.module.css'

interface ProposeFigureProps {
  /** Le contributeur a le rang pour ajouter une personnalité ; sinon on l'invite à contribuer */
  canAddFigure: boolean
}

/** Encart du rail, en encre sur papier : l'appel à ajouter une personnalité manquante. */
export default function ProposeFigure({ canAddFigure }: ProposeFigureProps) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Il manque quelqu’un ?</h2>
      <p className={styles.text}>
        Une personnalité entre sur Débats.co avec une page Wikipédia, ou deux sources indépendantes
        et fiables qui parlent d’elle.
      </p>
      <Button href={canAddFigure ? `${FIGURES_HREF}/ajouter` : CONTRIBUTE_HREF} variant="inverse">
        {canAddFigure ? 'Ajouter une personnalité' : 'Contribuer'}
      </Button>
    </section>
  )
}
