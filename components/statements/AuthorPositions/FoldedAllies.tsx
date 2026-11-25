'use client'

import { ReactNode, useId, useState } from 'react'
import Button from '../../ui/Button'
import styles from './AuthorPositions.module.css'

interface FoldedAlliesProps {
  /** Nombre d'alliés que la liste dépliée nomme */
  count: number
  /** Ce qui tient lieu de liste tant qu'elle est repliée */
  preview: ReactNode
  /** La liste complète, rendue par le serveur */
  children: ReactNode
}

/**
 * Une longue liste d'alliés, repliée sur quelques visages jusqu'à ce qu'on la
 * demande. Pas un `Collapsible` de Radix : il ne rend pas son contenu tant
 * qu'il est fermé, or la liste doit rester dans le HTML, masquée, pour que
 * les liens vers chaque allié soient lus par les moteurs de recherche.
 */
export default function FoldedAllies({ count, preview, children }: FoldedAlliesProps) {
  const [open, setOpen] = useState(false)
  const listId = useId()

  return (
    <div className={styles.folded}>
      <div className={styles.foldedHead}>
        {!open && preview}
        <Button
          variant="secondary"
          size="small"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Replier' : `Voir les ${count} voix`}
        </Button>
      </div>
      <div id={listId} hidden={!open}>
        {children}
      </div>
    </div>
  )
}
