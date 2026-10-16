import Link from 'next/link'
import { occupationFamilyHref } from '../../../../domain/read-models/occupations'
import {
  FamilyDistribution,
  familyPositionMatrix,
  FamilyPositionMatrix,
  MatrixCell,
  SMALL_FAMILY,
} from '../../../../domain/services/occupation-distribution'
import { plural } from '../../../../lib/plural'
import styles from './SubjectAnalyses.module.css'

interface SubjectAnalysesProps {
  distribution: FamilyDistribution
}

const percent = (share: number) => `${Math.round(share * 100)} %`
const signed = (deviation: number) => {
  const points = Math.round(deviation * 100)
  return points > 0 ? `+${points}` : String(points)
}
/** The deviation axis spans this many points on each side */
const DEVIATION_AXIS = 50

/** Nuance d'encre d'une position, de la plus à la moins soutenue */
const shadeClass = (index: number) => styles[`shade${Math.min(index, 5)}`]

/** Nuance d'une case de la matrice selon la part de la famille */
function cellClass(cell: MatrixCell): string {
  if (cell.count === 0) return styles.cellNone
  if (cell.share < 0.2) return styles.cell1
  if (cell.share < 0.4) return styles.cell2
  if (cell.share < 0.6) return styles.cell3
  return styles.cell4
}

const unassignedLabel = (count: number) =>
  `${count} ${plural(count, 'personnalité', 'personnalités')} sans métier renseigné`

function Legend({ matrix }: { matrix: FamilyPositionMatrix }) {
  return (
    <ul className={styles.legend} aria-label="Positions">
      {matrix.positions.map((position, index) => (
        <li key={position.id} className={styles.legendItem}>
          <span aria-hidden="true" className={`${styles.swatch} ${shadeClass(index)}`} />
          {position.title}
          <span className={styles.legendShare}>{percent(position.share)}</span>
        </li>
      ))}
    </ul>
  )
}

function StackedBar({
  label,
  cells,
  total,
  matrix,
  reference,
}: {
  label: React.ReactNode
  cells: MatrixCell[]
  total: number
  matrix: FamilyPositionMatrix
  reference?: boolean
}) {
  const description = cells
    .map((cell, i) => `${matrix.positions[i].title} : ${cell.count}`)
    .join(', ')
  return (
    <div className={reference ? `${styles.barRow} ${styles.barRowReference}` : styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.stack} role="img" aria-label={description}>
        {cells.map((cell, i) => (
          <div
            key={matrix.positions[i].id}
            className={`${styles.segment} ${shadeClass(i)}`}
            style={{ width: `${cell.share * 100}%` }}
          >
            {cell.share >= 0.12 && percent(cell.share)}
          </div>
        ))}
      </div>
      <span className={styles.barValue}>{total}</span>
    </div>
  )
}

/** Vers où penche chaque famille : une barre à 100 % par famille, l'ensemble en référence */
function LeaningBars({ matrix }: { matrix: FamilyPositionMatrix }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Vers où penche chaque famille de métiers</h3>
      <p className={styles.subtitle}>
        Part des prises de position de chaque famille qui va à chaque position, comparée à
        l’ensemble des personnalités.
      </p>
      <Legend matrix={matrix} />
      <div className={styles.bars}>
        {matrix.families.map(({ family, cells, total }) => (
          <StackedBar
            key={family.id}
            label={
              <Link href={occupationFamilyHref(family)} className={styles.familyLink}>
                {family.name}
              </Link>
            }
            cells={cells}
            total={total}
            matrix={matrix}
          />
        ))}
        <StackedBar
          label="Toutes familles"
          cells={matrix.overall.cells}
          total={matrix.overall.total}
          matrix={matrix}
          reference
        />
      </div>
    </section>
  )
}

/** Familles × positions : l'effectif et la part dans la famille, case par case */
function Matrix({ matrix }: { matrix: FamilyPositionMatrix }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Familles de métiers et positions</h3>
      <p className={styles.subtitle}>
        Combien de personnalités de chaque famille défendent chaque position, et la part que cela
        représente dans la famille. Plus la case est sombre, plus la famille penche.
      </p>
      <div className={styles.matrixScroll}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th scope="col" className={styles.matrixCorner}>
                <span className={styles.visuallyHidden}>Famille</span>
              </th>
              {matrix.positions.map((position) => (
                <th key={position.id} scope="col" className={styles.matrixHead}>
                  {position.title}
                </th>
              ))}
              <th scope="col" className={styles.matrixTotalHead}>
                total
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.families.map(({ family, cells, total }) => (
              <tr key={family.id}>
                <th scope="row" className={styles.matrixFamily}>
                  <Link href={occupationFamilyHref(family)} className={styles.familyLink}>
                    {family.name}
                  </Link>
                </th>
                {cells.map((cell, i) => (
                  <td key={matrix.positions[i].id} className={styles.matrixCell}>
                    <div className={`${styles.cell} ${cellClass(cell)}`}>
                      <span className={styles.cellCount}>{cell.count || '–'}</span>
                      {cell.count > 0 && (
                        <span className={styles.cellShare}>{percent(cell.share)}</span>
                      )}
                    </div>
                  </td>
                ))}
                <td className={styles.matrixTotal}>{total}</td>
              </tr>
            ))}
            <tr className={styles.matrixReference}>
              <th scope="row" className={styles.matrixFamily}>
                Toutes familles
              </th>
              {matrix.overall.cells.map((cell, i) => (
                <td key={matrix.positions[i].id} className={styles.matrixCell}>
                  <div className={`${styles.cell} ${styles.cellReference}`}>
                    <span className={styles.cellCount}>{cell.count}</span>
                    <span className={styles.cellShare}>{percent(cell.share)}</span>
                  </div>
                </td>
              ))}
              <td className={styles.matrixTotal}>{matrix.overall.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Position par position, l'écart de chaque famille à l'ensemble, en points */
function Deviations({ matrix }: { matrix: FamilyPositionMatrix }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Quelles familles penchent plus que les autres</h3>
      <p className={styles.subtitle}>
        Pour chaque position, l’écart entre la part de la famille et la part de l’ensemble des
        personnalités. À droite du trait, la famille y est plus favorable que la moyenne ; à gauche,
        moins. Une famille de moins de {SMALL_FAMILY} personnalités est grisée.
      </p>
      <div className={styles.deviationGrid}>
        {matrix.positions.map((position, i) => (
          <div key={position.id} className={styles.deviationBlock}>
            <div className={styles.deviationHead}>
              <span className={styles.deviationPosition}>{position.title}</span>
              <span className={styles.deviationOverall}>ensemble {percent(position.share)}</span>
            </div>
            <div className={styles.deviationRows}>
              {matrix.families.map(({ family, cells, small }) => {
                const cell = cells[i]
                const points = Math.max(
                  -DEVIATION_AXIS,
                  Math.min(DEVIATION_AXIS, Math.round(cell.deviation * 100)),
                )
                const dot = 50 + (points / DEVIATION_AXIS) * 50
                return (
                  <div key={family.id} className={styles.deviationRow}>
                    <span className={styles.deviationFamily}>{family.name}</span>
                    <div className={styles.deviationTrack}>
                      <div aria-hidden="true" className={styles.deviationAxis} />
                      <div
                        aria-hidden="true"
                        className={styles.deviationStem}
                        style={{ left: `${Math.min(50, dot)}%`, width: `${Math.abs(dot - 50)}%` }}
                      />
                      <div
                        role="img"
                        aria-label={`${family.name} : ${percent(cell.share)} contre ${percent(position.share)} pour l’ensemble`}
                        className={small ? `${styles.dot} ${styles.dotSmall}` : styles.dot}
                        style={{ left: `${dot}%` }}
                      />
                    </div>
                    <span className={styles.deviationValue}>{signed(cell.deviation)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Onglet Analyses d'un sujet : qui s'exprime, par famille de métiers, et vers quelle position. */
export default function SubjectAnalyses({ distribution }: SubjectAnalysesProps) {
  const { overall, unassignedCount } = distribution

  if (overall.length === 0) {
    return (
      <p className={styles.empty}>
        {unassignedCount === 0
          ? 'Les analyses apparaîtront avec les premières prises de position de personnalités.'
          : `Les analyses apparaîtront quand les personnalités de ce sujet auront un métier renseigné (${unassignedLabel(unassignedCount)}).`}
      </p>
    )
  }

  const matrix = familyPositionMatrix(distribution)

  return (
    <div className={styles.analyses}>
      <LeaningBars matrix={matrix} />
      <Matrix matrix={matrix} />
      <Deviations matrix={matrix} />
      <p className={styles.note}>
        Une personnalité compte une fois par famille et par position.
        {unassignedCount > 0 && ` ${unassignedLabel(unassignedCount)}.`}
      </p>
    </div>
  )
}
