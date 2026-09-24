import Link from 'next/link'
import ComingSoon from '../../../../components/ui/ComingSoon'
import { ThemeCount, YearCount } from '../../../../domain/services/figure-activity'
import styles from './FigureAnalyses.module.css'

interface FigureAnalysesProps {
  themes: ThemeCount[]
  perYear: YearCount[]
}

const CHART = { width: 340, height: 120, top: 22, bottom: 30, gap: 12, maxBar: 22 }

/** Graphique en colonnes des prises de position par année, l'année la plus active en signal. */
function ActivityChart({ perYear }: { perYear: YearCount[] }) {
  const max = Math.max(...perYear.map((y) => y.count))
  const plotHeight = CHART.height - CHART.top - CHART.bottom
  const slot = CHART.width / perYear.length
  const bar = Math.min(CHART.maxBar, slot - CHART.gap)
  const baseline = CHART.top + plotHeight

  return (
    <svg
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      className={styles.chart}
      role="img"
      aria-label={perYear.map((y) => `${y.year} : ${y.count}`).join(', ')}
    >
      <line
        x1="0"
        y1={baseline}
        x2={CHART.width}
        y2={baseline}
        stroke="var(--line)"
        strokeWidth="1"
      />
      {perYear.map((y, index) => {
        const x = index * slot + (slot - bar) / 2
        const h = max > 0 ? Math.max(2, (y.count / max) * plotHeight) : 0
        const isMax = y.count === max && max > 0
        const r = Math.min(4, h / 2)
        return (
          <g key={y.year}>
            {y.count > 0 && (
              <path
                d={`M${x} ${baseline} V${baseline - h + r} a${r} ${r} 0 0 1 ${r} -${r} h${bar - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} V${baseline} Z`}
                fill={isMax ? 'var(--signal)' : 'var(--ink)'}
              />
            )}
            {isMax && (
              <text
                x={x + bar / 2}
                y={baseline - h - 6}
                textAnchor="middle"
                className={styles.chartValue}
              >
                {y.count}
              </text>
            )}
            <text
              x={x + bar / 2}
              y={CHART.height - 8}
              textAnchor="middle"
              className={isMax ? `${styles.chartLabel} ${styles.chartLabelOn}` : styles.chartLabel}
            >
              {y.year}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Analyses du rail d'une personnalité : thèmes, fréquence d'expression, arguments. */
export default function FigureAnalyses({ themes, perYear }: FigureAnalysesProps) {
  const maxTheme = themes[0]?.count ?? 0

  return (
    <>
      <div className={styles.card}>
        <p className={styles.title}>Thèmes de prédilection</p>
        {themes.length === 0 ? (
          <p className={styles.empty}>
            Les sujets de cette personnalité n’ont pas encore de thème.
          </p>
        ) : (
          <ul className={styles.bars}>
            {themes.map(({ theme, count }) => (
              <li key={theme.id} className={styles.bar}>
                <Link href={`/themes/${theme.slug}`} className={styles.barLabel}>
                  {theme.name}
                </Link>
                <div className={styles.track}>
                  <div className={styles.fill} style={{ width: `${(count / maxTheme) * 100}%` }} />
                </div>
                <span className={styles.barValue}>{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {perYear.length > 0 && (
        <div className={styles.card}>
          <p className={styles.title}>Fréquence d’expression</p>
          <p className={styles.subtitle}>Prises de position par année</p>
          <ActivityChart perYear={perYear} />
        </div>
      )}

      <ComingSoon as="div" className={styles.card}>
        <p className={styles.title}>Arguments les plus mobilisés</p>
        <p className={styles.empty}>
          Les raisonnements récurrents de cette personnalité, à travers ses prises de position.
        </p>
      </ComingSoon>
    </>
  )
}
