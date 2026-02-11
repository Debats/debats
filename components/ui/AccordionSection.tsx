'use client'

import { useState } from 'react'
import styles from './accordion-section.module.css'

interface AccordionSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function AccordionSection({
  title,
  children,
  defaultOpen = false,
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <details
      className={styles.section}
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className={styles.summary}>
        {title}
        <span className={styles.indicator}>{isOpen ? '\u2212' : '+'}</span>
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  )
}
