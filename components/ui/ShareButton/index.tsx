'use client'

import { useState, useEffect } from 'react'
import { useShareButtonContext } from './ShareButtonContext'
import ShareIcon from './ShareIcon'
import styles from './ShareButton.module.css'

interface ShareButtonProps {
  title?: string
  text?: string
  /** Icône seule et sans cadre, pour le header mobile ; ne compte pas comme bouton de page */
  iconOnly?: boolean
  /** Icône seule dans un bouton rond, à côté de l'action principale d'une page */
  compact?: boolean
}

export default function ShareButton({ title, text, iconOnly, compact }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const { register } = useShareButtonContext()

  useEffect(() => {
    if (iconOnly) return
    return register()
  }, [iconOnly, register])

  async function handleShare() {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') throw err
      }
      return
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const withoutLabel = iconOnly || compact
  const size = iconOnly ? 20 : 16
  const className = iconOnly ? styles.iconButton : compact ? styles.compact : styles.button

  return (
    <button
      className={className}
      onClick={handleShare}
      type="button"
      aria-label={copied ? 'Lien copié !' : 'Partager cette page'}
    >
      <ShareIcon size={size} done={copied} />
      {!withoutLabel && (copied ? 'Lien copié !' : 'Partager')}
    </button>
  )
}
