'use client'

import { ReactNode, useState } from 'react'
import Button from '../Button'
import styles from './ShowMore.module.css'

interface ShowMoreProps {
  /** Éléments déjà rendus (avec leur clé), dans l'ordre d'affichage */
  items: ReactNode[]
  /** Nombre d'éléments visibles avant de dérouler */
  initialCount: number
  /** Libellé du bouton, calculé par l'appelant (ex. « Voir les 17 autres sujets ») */
  moreLabel: string
}

/** Affiche les premiers éléments d'une liste, puis tous après un clic. */
export default function ShowMore({ items, initialCount, moreLabel }: ShowMoreProps) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, initialCount)
  const hasMore = !expanded && items.length > initialCount

  return (
    <>
      {visible}
      {hasMore && (
        <div className={styles.more}>
          <Button variant="secondary" onClick={() => setExpanded(true)}>
            {moreLabel}
          </Button>
        </div>
      )}
    </>
  )
}
