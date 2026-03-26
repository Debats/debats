'use client'

import { useState } from 'react'
import Image from 'next/image'
import styles from './figure-avatar.module.css'

interface FigureAvatarProps {
  slug: string
  name: string
  size?: number
}

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function FigureAvatar({ slug, name, size = 100 }: FigureAvatarProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <span
        className={styles.placeholder}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
        title={name}
      >
        {initials(name)}
      </span>
    )
  }

  return (
    <Image
      src={`/avatars/${slug}.jpg`}
      alt={name}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={styles.avatar}
      onError={() => setError(true)}
    />
  )
}
