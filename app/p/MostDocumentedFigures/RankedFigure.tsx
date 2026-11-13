import Link from 'next/link'
import FigureAvatar from '../../../components/figures/FigureAvatar'
import { RankedFigure as RankedFigureModel } from '../../../domain/read-models/figure-index'
import { figureHref } from '../../../domain/read-models/hrefs'
import { formatShortDate } from '../../../lib/format-date'
import { plural } from '../../../lib/plural'
import styles from './MostDocumentedFigures.module.css'

/** Une ligne du classement : son rang, qui elle est, et la mesure de ce que le site sait d'elle. */
export default function RankedFigure({ figure }: { figure: RankedFigureModel }) {
  const { statementsCount, subjectsCount, latestStatementAt } = figure

  return (
    <li className={styles.item}>
      <Link href={figureHref(figure.slug)} className={styles.row}>
        <span className={styles.rank}>{figure.rank}</span>
        <span className={styles.avatar}>
          <FigureAvatar slug={figure.slug} name={figure.name} size={48} />
        </span>
        <span className={styles.identity}>
          <span className={styles.name}>{figure.name}</span>
          {figure.role && <span className={styles.role}>{figure.role}</span>}
        </span>
        <span className={styles.measure}>
          <span className={styles.track} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${figure.share * 100}%` }} />
          </span>
          <span className={styles.subjects}>
            <span className={styles.count}>{subjectsCount}</span>
            <span className={styles.unit}>{plural(subjectsCount, 'sujet', 'sujets')}</span>
          </span>
        </span>
        <span className={styles.meta}>
          <span>
            {statementsCount} {plural(statementsCount, 'prise de position', 'prises de position')}
          </span>
          {latestStatementAt && <span>dernière le {formatShortDate(latestStatementAt)}</span>}
        </span>
      </Link>
    </li>
  )
}
