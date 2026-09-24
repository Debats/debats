'use client'

import { useState } from 'react'
import Image from 'next/image'
import styles from './OrganisationLogo.module.css'

interface OrganisationLogoProps {
  slug: string
  name: string
  acronym?: string | null
  size?: number
}

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter((word) => word.length > 2)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Logo d'une organisation, ou à défaut son sigle sur fond violet.
 * Carré arrondi, pour se distinguer au premier regard des avatars ronds des personnalités.
 */
export default function OrganisationLogo({
  slug,
  name,
  acronym,
  size = 80,
}: OrganisationLogoProps) {
  const [missing, setMissing] = useState(false)

  if (missing) {
    const text = acronym?.trim() || initials(name)
    const fontSize = text.length > 4 ? size * 0.2 : size * 0.3
    return (
      <span
        className={styles.placeholder}
        style={{ width: size, height: size, fontSize }}
        title={name}
      >
        {text}
      </span>
    )
  }

  return (
    <Image
      src={`/logos/${slug}.png`}
      alt={name}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={styles.logo}
      onError={() => setMissing(true)}
    />
  )
}
