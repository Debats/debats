import Link from 'next/link'
import { occupationFamilyHref } from '../../../../domain/read-models/occupations'
import {
  FamilyPositionMatrix,
  MatrixCell,
} from '../../../../domain/services/occupation-distribution'
import { percent } from './labels'
import styles from './SubjectAnalyses.module.css'

/** Nuance d'une case de la matrice selon la part de la famille */
function cellClass(cell: MatrixCell): string {
  if (cell.count === 0) return styles.cellNone
  if (cell.share < 0.2) return styles.cell1
  if (cell.share < 0.4) return styles.cell2
  if (cell.share < 0.6) return styles.cell3
  return styles.cell4
}

/** Familles × positions : l'effectif et la part dans la famille, case par case */
export default function Matrix({ matrix }: { matrix: FamilyPositionMatrix }) {
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
