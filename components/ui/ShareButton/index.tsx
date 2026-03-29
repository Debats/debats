'use client'

import { useState, useEffect } from 'react'
import { useShareButtonContext } from './ShareButtonContext'
import styles from './ShareButton.module.css'

interface ShareButtonProps {
  title?: string
  text?: string
  iconOnly?: boolean
}

const svgProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
}

export default function ShareButton({ title, text, iconOnly }: ShareButtonProps) {
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

  const size = iconOnly ? 20 : 14

  return (
    <button
      className={iconOnly ? styles.iconButton : styles.button}
      onClick={handleShare}
      type="button"
      aria-label="Partager cette page"
    >
      {copied ? (
        <svg {...svgProps} width={size} height={size}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg {...svgProps} width={size} height={size}>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
      {!iconOnly && (copied ? 'Lien copié !' : 'Partager')}
    </button>
  )
}
