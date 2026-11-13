import Button from '../../../components/ui/Button'
import { RankedFigure as RankedFigureModel } from '../../../domain/read-models/figure-index'
import RankedFigure from './RankedFigure'
import styles from './MostDocumentedFigures.module.css'

interface MostDocumentedFiguresProps {
  /** Déjà classées, la plus documentée d'abord ; seulement celles à montrer */
  figures: RankedFigureModel[]
  /** Combien le classement en compte en tout */
  total: number
  /** L'adresse qui en déplie davantage ; absente quand tout est montré */
  moreHref?: string
}

/** La vue plate de l'index : toutes les personnalités, de la plus à la moins documentée. */
export default function MostDocumentedFigures({
  figures,
  total,
  moreHref,
}: MostDocumentedFiguresProps) {
  return (
    <>
      <ol className={styles.list}>
        {figures.map((figure) => (
          <RankedFigure key={figure.id} figure={figure} />
        ))}
      </ol>

      <div className={styles.footer}>
        <p className={styles.range}>
          {figures.length} sur {total}
        </p>
        {moreHref && (
          <Button href={moreHref} variant="secondary">
            Charger la suite
          </Button>
        )}
      </div>
    </>
  )
}
