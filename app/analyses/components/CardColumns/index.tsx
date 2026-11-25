import styles from './CardColumns.module.css'

/** Des cartes d'analyse côte à côte, l'une sous l'autre quand la place manque. */
export default function CardColumns({ children }: { children: React.ReactNode }) {
  return <div className={styles.columns}>{children}</div>
}
