import styles from './Chapter.module.css'

interface ChapterProps {
  /** L'ancre du chapitre : la barre d'ancres de la page y mène */
  id: string
  title: string
  children: React.ReactNode
}

/**
 * Un chapitre des analyses : ce qui se compare d'un sujet à l'autre, d'une
 * personnalité à l'autre, d'une organisation à l'autre. Un chapitre dont
 * aucun bloc n'a quoi montrer ne se montre pas : c'est la feuille de style
 * qui le dit, les blocs décidant seuls de se rendre.
 */
export default function Chapter({ id, title, children }: ChapterProps) {
  return (
    <section id={id} className={styles.chapter}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.blocks}>{children}</div>
    </section>
  )
}
