import Link from 'next/link'
import { occupationFamilyHref } from '../../../../domain/read-models/occupations'
import { FamilyPositionMatrix } from '../../../../domain/services/occupation-distribution'
import Legend from './Legend'
import StackedBar from './StackedBar'
import styles from './SubjectAnalyses.module.css'

/** Vers où penche chaque famille : une barre à 100 % par famille, l'ensemble en référence */
export default function LeaningBars({ matrix }: { matrix: FamilyPositionMatrix }) {
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
