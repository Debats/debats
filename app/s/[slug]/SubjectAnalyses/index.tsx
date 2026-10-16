import Link from 'next/link'
import { occupationFamilyHref } from '../../../../domain/read-models/occupations'
import {
  FamilyCount,
  FamilyDistribution,
} from '../../../../domain/services/occupation-distribution'
import { plural } from '../../../../lib/plural'
import styles from './SubjectAnalyses.module.css'

interface SubjectAnalysesProps {
  distribution: FamilyDistribution
}

function FamilyBars({ families }: { families: FamilyCount[] }) {
  const max = families[0]?.count ?? 0
  return (
    <ul className={styles.bars}>
      {families.map(({ family, count }) => (
        <li key={family.id} className={styles.bar}>
          <Link href={occupationFamilyHref(family)} className={styles.barLabel}>
            {family.name}
          </Link>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className={styles.barValue}>{count}</span>
        </li>
      ))}
    </ul>
  )
}

const unassignedLabel = (count: number) =>
  `${count} ${plural(count, 'personnalité', 'personnalités')} sans métier renseigné`

/** Onglet Analyses d'un sujet : qui s'exprime, par famille de métiers, en tout et par position. */
export default function SubjectAnalyses({ distribution }: SubjectAnalysesProps) {
  const { overall, unassignedCount, byPosition } = distribution

  if (overall.length === 0 && unassignedCount === 0) {
    return (
      <p className={styles.empty}>
        Les analyses apparaîtront avec les premières prises de position de personnalités.
      </p>
    )
  }

  return (
    <div className={styles.analyses}>
      <section className={styles.card}>
        <h3 className={styles.title}>Qui s’exprime, par famille de métiers</h3>
        <p className={styles.subtitle}>
          Une personnalité compte une fois par famille, quel que soit son nombre de prises de
          position.
        </p>
        {overall.length === 0 ? (
          <p className={styles.note}>{unassignedLabel(unassignedCount)}.</p>
        ) : (
          <>
            <FamilyBars families={overall} />
            {unassignedCount > 0 && (
              <p className={styles.note}>{unassignedLabel(unassignedCount)}.</p>
            )}
          </>
        )}
      </section>

      <section className={styles.card}>
        <h3 className={styles.title}>Par position</h3>
        <div className={styles.positions}>
          {byPosition.map(({ position, families, unassignedCount }) => (
            <div key={position.id} className={styles.position}>
              <p className={styles.positionTitle}>{position.title}</p>
              {families.length === 0 ? (
                <p className={styles.note}>{unassignedLabel(unassignedCount)}.</p>
              ) : (
                <ul
                  className={styles.chips}
                  aria-label={`Familles de métiers pour ${position.title}`}
                >
                  {families.map(({ family, count }) => (
                    <li key={family.id}>
                      <Link href={occupationFamilyHref(family)} className={styles.chip}>
                        {family.name}
                        <span className={styles.chipCount}>{count}</span>
                      </Link>
                    </li>
                  ))}
                  {unassignedCount > 0 && (
                    <li className={styles.chipMuted}>{unassignedLabel(unassignedCount)}</li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
