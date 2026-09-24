import { ReactNode } from 'react'
import styles from './ComingSoon.module.css'

export const COMING_SOON_MESSAGE = 'Bientôt disponible !'

interface ComingSoonProps {
  children: ReactNode
  /** Bloc entier (carte, section) plutôt qu'un élément en ligne (onglet, lien) */
  block?: boolean
  className?: string
}

/**
 * Grise un élément d'interface dont la fonctionnalité n'existe pas encore.
 * Le contenu reste visible pour montrer ce qui arrive, mais n'est ni cliquable
 * ni annoncé comme actif ; le message « Bientôt disponible ! » l'accompagne.
 */
export default function ComingSoon({ children, block, className }: ComingSoonProps) {
  const Tag = block ? 'div' : 'span'
  const classes = [styles.soon, block ? styles.block : styles.inline, className]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={classes} aria-disabled="true" title={COMING_SOON_MESSAGE}>
      <span className={styles.content} inert>
        {children}
      </span>
      <span className={styles.badge}>{block ? COMING_SOON_MESSAGE : 'bientôt'}</span>
    </Tag>
  )
}
