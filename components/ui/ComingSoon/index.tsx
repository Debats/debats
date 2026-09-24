'use client'

import { MouseEvent, PointerEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { Tooltip } from 'radix-ui'
import styles from './ComingSoon.module.css'

export const COMING_SOON_MESSAGE = 'Bientôt disponible !'

/** Durée d'affichage après un toucher, faute de survol pour le maintenir */
const TOUCH_DISPLAY_MS = 2000

interface ComingSoonProps {
  children: ReactNode
  /** Élément rendu : un div pour un bloc (carte, entrée de liste de définitions), un span sinon */
  as?: 'span' | 'div'
  className?: string
}

/**
 * Grise un élément d'interface dont la fonctionnalité n'existe pas encore.
 * Le contenu reste visible pour montrer ce qui arrive, mais n'est pas
 * cliquable ; le message « Bientôt disponible ! » apparaît au survol, au focus
 * clavier, et au toucher sur les écrans tactiles (que Radix ignore par défaut).
 */
export default function ComingSoon({ children, as: Tag = 'span', className }: ComingSoonProps) {
  const [open, setOpen] = useState(false)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastPointerWasTouch = useRef(false)
  const classes = [styles.soon, className].filter(Boolean).join(' ')

  useEffect(() => () => clearTimeout(touchTimer.current), [])

  // Radix appelle nos gestionnaires en premier et ignore les siens quand
  // l'événement est annulé : c'est ainsi qu'on lui retire le toucher, qu'il
  // traiterait comme un clic fermant l'infobulle.
  function handlePointerDown(event: PointerEvent) {
    lastPointerWasTouch.current = event.pointerType === 'touch'
    if (!lastPointerWasTouch.current) return
    event.preventDefault()
    clearTimeout(touchTimer.current)
    const next = !open
    setOpen(next)
    if (next) touchTimer.current = setTimeout(() => setOpen(false), TOUCH_DISPLAY_MS)
  }

  function handleClick(event: MouseEvent) {
    if (lastPointerWasTouch.current) event.preventDefault()
  }

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild>
          <Tag
            className={classes}
            tabIndex={0}
            aria-disabled="true"
            onPointerDown={handlePointerDown}
            onClick={handleClick}
          >
            {children}
          </Tag>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className={styles.tooltip}
            sideOffset={6}
            onPointerDownOutside={() => setOpen(false)}
          >
            {COMING_SOON_MESSAGE}
            <Tooltip.Arrow className={styles.arrow} width={10} height={5} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
