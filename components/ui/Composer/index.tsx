'use client'

import { KeyboardEvent, useState } from 'react'
import styles from './Composer.module.css'

interface ComposerProps {
  id: string
  label: string
  placeholder: string
  onSend: (text: string) => void
  disabled: boolean
}

/** Where a person writes to an assistant: Enter sends, Shift+Enter breaks the line */
export default function Composer({ id, label, placeholder, onSend, disabled }: ComposerProps) {
  const [text, setText] = useState('')

  const send = () => {
    const message = text.trim()
    if (!message || disabled) return
    onSend(message)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={styles.composer}>
      <label htmlFor={id} className={styles.visuallyHidden}>
        {label}
      </label>
      <textarea
        id={id}
        className={styles.ask}
        rows={2}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className={styles.row}>
        <span className={styles.hint}>Entrée pour envoyer · Maj+Entrée pour une ligne</span>
        <button type="button" className={styles.send} onClick={send} disabled={disabled}>
          Envoyer
        </button>
      </div>
    </div>
  )
}
