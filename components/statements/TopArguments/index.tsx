import Link from 'next/link'
import { ArgumentCount } from '../../../domain/services/figure-activity'
import { argumentHref } from '../ArgumentChips'
import styles from './TopArguments.module.css'

interface TopArgumentsProps {
  arguments: ArgumentCount<{ id: string; title: string; subjectSlug: string }>[]
  /** « cette personnalité », « cette organisation » */
  who: string
}

/** Encart du rail : les arguments qu'un auteur mobilise le plus, en barres. */
export default function TopArguments({ arguments: top, who }: TopArgumentsProps) {
  const max = top[0]?.count ?? 0

  return (
    <div className={styles.card}>
      <p className={styles.title}>Arguments les plus mobilisés</p>
      {top.length === 0 ? (
        <p className={styles.empty}>
          Les prises de position de {who} ne mobilisent pas encore d’argument recensé.
        </p>
      ) : (
        <ul className={styles.bars}>
          {top.map(({ argument, count }) => (
            <li key={argument.id} className={styles.bar}>
              <Link href={argumentHref(argument.subjectSlug, argument.id)} className={styles.label}>
                {argument.title}
              </Link>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${(count / max) * 100}%` }} />
              </div>
              <span className={styles.value}>{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
