import { Children, CSSProperties } from 'react'
import RuledSection from '../../components/layout/RuledSection'
import styles from './Shelf.module.css'

interface ShelfProps {
  title: string
  /** Combien l'index en compte en tout */
  total: number
  /** L'index que le rayon ne fait qu'entamer */
  more: { href: string; label: string }
  /** La largeur en dessous de laquelle une carte passe à la ligne, en pixels */
  columnMin?: number
  /** Une grille propre au rayon, quand ses cases ne sont pas des cartes */
  listClassName?: string
  /** Ce que le rayon expose, un élément par case */
  children: React.ReactNode
}

/**
 * Un rayon de l'accueil : un titre, le lien vers l'index avec ce qu'il
 * compte, et quelques-uns de ses éléments côte à côte. Un rayon qui n'a rien
 * à exposer ne se montre pas.
 */
export default function Shelf({
  title,
  total,
  more,
  columnMin = 300,
  listClassName,
  children,
}: ShelfProps) {
  if (Children.count(children) === 0) return null
  // The count is the index's, not the shelf's: it goes with the link that leads there
  const toIndex = { href: more.href, label: `${more.label} (${total.toLocaleString('fr-FR')})` }

  return (
    <RuledSection title={title} more={toIndex} moreInHead>
      <ul
        className={listClassName ?? styles.cards}
        style={{ '--shelf-column': `${columnMin}px` } as CSSProperties}
      >
        {Children.map(children, (child) => (
          <li className={styles.cell}>{child}</li>
        ))}
      </ul>
    </RuledSection>
  )
}
