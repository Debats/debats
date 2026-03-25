'use client'

import { useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import styles from './AdminMenu.module.css'

interface AdminMenuAction {
  label: string
  icon: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'danger'
}

interface AdminMenuProps {
  actions: AdminMenuAction[]
  /** Optional slot rendered inside the dropdown below the action buttons */
  children?: ReactNode
}

export default function AdminMenu({ actions, children }: AdminMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={toggle}
        aria-label="Actions d'administration"
        aria-expanded={open}
      >
        <span className={styles.triggerIcon}>⚙</span> Gérer
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>Administration</div>
          {actions.map((action) => {
            const className = `${styles.action} ${action.variant === 'danger' ? styles.actionDanger : ''}`

            if (action.href) {
              return (
                <a key={action.label} href={action.href} className={className}>
                  <span className={styles.actionIcon}>{action.icon}</span>
                  {action.label}
                </a>
              )
            }

            return (
              <button
                key={action.label}
                type="button"
                className={className}
                onClick={() => {
                  action.onClick?.()
                  setOpen(false)
                }}
              >
                <span className={styles.actionIcon}>{action.icon}</span>
                {action.label}
              </button>
            )
          })}
          {children && <div className={styles.extra}>{children}</div>}
        </div>
      )}
    </div>
  )
}
