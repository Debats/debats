import Link from 'next/link'
import FigureAvatar from '../../components/figures/FigureAvatar'
import { Glimpse } from '../../domain/read-models/home-page'
import { FIGURES_HREF, figureHref } from '../../domain/read-models/hrefs'
import { PublicFigureActivitySummary } from '../../domain/value-objects/public-figure-activity-summary'
import { plural } from '../../lib/plural'
import Shelf from '../Shelf'
import styles from './FigureShelf.module.css'

/**
 * Le rayon des personnalités, sur l'accueil : celles que le site documente
 * sur le plus de sujets, en rangées pleines.
 */
export default function FigureShelf({
  figures,
}: {
  figures: Glimpse<PublicFigureActivitySummary>
}) {
  return (
    <Shelf
      title="Personnalités"
      total={figures.total}
      more={{ href: FIGURES_HREF, label: 'Toutes les personnalités' }}
      listClassName={styles.faces}
    >
      {figures.shown.map((figure) => (
        <Link key={figure.id} href={figureHref(figure.slug)} className={styles.face}>
          <FigureAvatar slug={figure.slug} name={figure.name} size={96} />
          <span className={styles.name}>{figure.name}</span>
          <span className={styles.subjects}>
            {figure.subjectsCount} {plural(figure.subjectsCount, 'sujet', 'sujets')}
          </span>
        </Link>
      ))}
    </Shelf>
  )
}
