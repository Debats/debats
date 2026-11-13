'use client'

import Link from 'next/link'
import { DropdownMenu } from 'radix-ui'
import { CONTRIBUTE_HREF, FLAGS_HREF } from '../../../domain/read-models/hrefs'
import { useFlagsToSettle } from './use-flags-to-settle'
import styles from './UserMenu.module.css'

interface UserMenuProps {
  /** Le nom du compte, ou à défaut son adresse */
  displayName: string
  onSignOut: () => void
}

/** Deux lettres au plus : initiales d'un nom, ou début d'une adresse e-mail. */
function initials(displayName: string): string {
  const words = displayName.split(/[\s@._-]+/).filter(Boolean)
  const letters = words.length > 1 ? words.slice(0, 2).map((w) => w[0]) : displayName.slice(0, 2)
  return Array.from(letters).join('').toUpperCase()
}

/**
 * Le menu de la personne connectée, derrière ses initiales : son compte,
 * contribuer, les signalements à traiter quand elle en a le droit, se
 * déconnecter. Une pastille sur les initiales dit qu'il y a des signalements
 * en attente sans qu'il faille ouvrir le menu.
 */
export default function UserMenu({ displayName, onSignOut }: UserMenuProps) {
  const flagsToSettle = useFlagsToSettle()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={styles.avatar} aria-label={`Mon compte : ${displayName}`}>
        <span aria-hidden="true">{initials(displayName)}</span>
        {flagsToSettle !== null && flagsToSettle > 0 && (
          <span className={styles.badge} aria-hidden="true" />
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menu} align="end" sideOffset={8}>
          <DropdownMenu.Label className={styles.name}>{displayName}</DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <Link href="/me" className={styles.item}>
              Mon compte
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href={CONTRIBUTE_HREF} className={styles.item}>
              Contribuer
            </Link>
          </DropdownMenu.Item>
          {flagsToSettle !== null && (
            <DropdownMenu.Item asChild>
              <Link href={FLAGS_HREF} className={styles.item}>
                Signalements
                {flagsToSettle > 0 && <span className={styles.count}>{flagsToSettle}</span>}
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className={styles.separator} />
          <DropdownMenu.Item className={styles.item} onSelect={onSignOut}>
            Déconnexion
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
