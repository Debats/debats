'use client'

import { ReactNode } from 'react'
import { Tooltip } from 'radix-ui'
import styles from './ComingSoon.module.css'

export const COMING_SOON_MESSAGE = 'Bientôt disponible !'

interface ComingSoonProps {
  children: ReactNode
  /** Élément rendu : un div pour un bloc (carte, entrée de liste de définitions), un span sinon */
  as?: 'span' | 'div'
  className?: string
}

/**
 * Grise un élément d'interface dont la fonctionnalité n'existe pas encore.
 * Le contenu reste visible pour montrer ce qui arrive, mais n'est pas
 * cliquable ; le message « Bientôt disponible ! » apparaît au survol ou au
 * focus clavier.
 */
export default function ComingSoon({ children, as: Tag = 'span', className }: ComingSoonProps) {
  const classes = [styles.soon, className].filter(Boolean).join(' ')

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Tag className={classes} tabIndex={0} aria-disabled="true">
            {children}
          </Tag>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className={styles.tooltip} sideOffset={6}>
            {COMING_SOON_MESSAGE}
            <Tooltip.Arrow className={styles.arrow} width={10} height={5} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
