'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import FigureAvatar from '../FigureAvatar'
import styles from './FigureAvatarRow.module.css'

interface Figure {
  id: string
  name: string
  slug: string
}

interface FigureAvatarRowProps {
  figures: Figure[]
  totalCount?: number
  size?: number
  maxLines?: number
  /** Appended after /p/{slug} (e.g. "/s/le-nucleaire") */
  hrefSuffix?: string
}

export default function FigureAvatarRow({
  figures,
  totalCount,
  size = 40,
  maxLines = 1,
  hrefSuffix = '',
}: FigureAvatarRowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(figures.length)

  const total = totalCount ?? figures.length
  const gap = 8

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function computeVisible() {
      const itemWidth = size + gap
      const containerWidth = container!.clientWidth
      const perLine = Math.floor((containerWidth + gap) / itemWidth)
      const maxVisible = perLine * maxLines
      setVisibleCount(Math.min(figures.length, maxVisible))
    }

    computeVisible()

    const observer = new ResizeObserver(computeVisible)
    observer.observe(container)
    return () => observer.disconnect()
  }, [figures.length, size, gap, maxLines])

  if (figures.length === 0) return null

  const hasHidden = total > visibleCount
  const displayCount = hasHidden ? Math.max(visibleCount - 1, 0) : visibleCount
  const badgeCount = total - displayCount

  return (
    <div className={styles.row} ref={containerRef}>
      {figures.slice(0, displayCount).map((figure) => (
        <Link
          key={figure.id}
          href={`/p/${figure.slug}${hrefSuffix}`}
          className={styles.link}
          title={figure.name}
        >
          <FigureAvatar slug={figure.slug} name={figure.name} size={size} />
        </Link>
      ))}
      {badgeCount > 0 && (
        <span className={styles.overflow} style={{ width: size, height: size }}>
          +{badgeCount}
        </span>
      )}
    </div>
  )
}
