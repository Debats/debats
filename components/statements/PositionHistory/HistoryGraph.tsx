import { CSSProperties } from 'react'
import { HistoryRow, LaneTone } from '../../../domain/read-models/position-history'
import styles from './PositionHistory.module.css'

interface HistoryGraphProps {
  lanes: number
  row: Pick<HistoryRow<never>, 'lane' | 'tone' | 'restated' | 'crossing' | 'curvesFrom'>
}

const inLane = (lane: number) => ({ '--lane': lane }) as CSSProperties

const lineOf = (tone: LaneTone, part: string) =>
  `${tone === 'left' ? styles.lineLeft : styles.line} ${part}`

/**
 * Ce que les couloirs dessinent à la hauteur d'une prise de position : les
 * couloirs qui traversent, son point, et la courbe qui y arrive d'un autre
 * couloir. Masqué aux lecteurs d'écran, qui lisent la date, la position et
 * sa source sur la ligne.
 */
export default function HistoryGraph({ lanes, row }: HistoryGraphProps) {
  // Les courbes se dessinent en unités de couloir : un couloir fait 1 de large, son axe est au milieu
  const axis = (lane: number) => lane + 0.5
  const to = axis(row.lane)

  return (
    <span className={styles.graph} aria-hidden="true">
      {row.crossing.map(({ lane, tone }) => (
        <span key={lane} className={lineOf(tone, styles.through)} style={inLane(lane)} />
      ))}
      <span className={lineOf(row.tone, styles.above)} style={inLane(row.lane)} />
      {row.restated && <span className={lineOf(row.tone, styles.below)} style={inLane(row.lane)} />}

      {row.curvesFrom.length > 0 && (
        <span className={styles.curves}>
          <svg viewBox={`0 0 ${lanes} 1`} preserveAspectRatio="none">
            {row.curvesFrom.map((lane) => (
              <path
                key={lane}
                d={`M${axis(lane)} 1 C${axis(lane)} 0.5, ${to} 0.5, ${to} 0`}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </span>
      )}

      <span
        className={row.tone === 'left' ? styles.nodeLeft : styles.node}
        style={inLane(row.lane)}
      />
    </span>
  )
}
