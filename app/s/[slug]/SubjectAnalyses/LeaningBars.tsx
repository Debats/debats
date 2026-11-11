import Link from 'next/link'
import ShareBar from '../../../../components/charts/ShareBar'
import ShareLegend from '../../../../components/charts/ShareLegend'
import { occupationFamilyHref } from '../../../../domain/read-models/hrefs'
import {
  FamilyPositionMatrix,
  MatrixCell,
} from '../../../../domain/services/occupation-distribution'
import { percent } from '../../../../lib/percent'
import styles from './SubjectAnalyses.module.css'

/** Vers où penche chaque famille : une barre à 100 % par famille, l'ensemble en référence */
export default function LeaningBars({ matrix }: { matrix: FamilyPositionMatrix }) {
  /** Les cellules d'une ligne, nommées par les positions de la matrice */
  const shares = (cells: MatrixCell[]) =>
    cells.map((cell, index) => ({
      key: matrix.positions[index].id,
      label: matrix.positions[index].title,
      count: cell.count,
      share: cell.share,
    }))

  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Vers où penche chaque famille de métiers</h3>
      <p className={styles.subtitle}>
        Part des prises de position de chaque famille qui va à chaque position, comparée à
        l’ensemble des personnalités.
      </p>
      <ShareLegend
        items={matrix.positions.map((position) => ({
          key: position.id,
          label: position.title,
          note: percent(position.share),
        }))}
      />
      <div className={styles.bars}>
        {matrix.families.map(({ family, cells, total }) => (
          <ShareBar
            key={family.id}
            label={
              <Link href={occupationFamilyHref(family)} className={styles.familyLink}>
                {family.name}
              </Link>
            }
            shares={shares(cells)}
            value={total}
          />
        ))}
        <ShareBar
          label="Toutes familles"
          shares={shares(matrix.overall.cells)}
          value={matrix.overall.total}
          reference
        />
      </div>
    </section>
  )
}
