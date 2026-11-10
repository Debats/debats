import { KeyboardEvent, useState } from 'react'
import styles from './DraftDialogue.module.css'

interface ComposerProps {
  onAsk: (request: string) => void
  disabled: boolean
}

/** Where the person writes to the assistant: Enter sends, Shift+Enter breaks the line */
export default function Composer({ onAsk, disabled }: ComposerProps) {
  const [text, setText] = useState('')

  const send = () => {
    const request = text.trim()
    if (!request || disabled) return
    onAsk(request)
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
      <label htmlFor="draft-dialogue-ask" className={styles.visuallyHidden}>
        Votre demande à l’IA
      </label>
      <textarea
        id="draft-dialogue-ask"
        className={styles.ask}
        rows={2}
        placeholder="Dites ce qu’il faut changer, ou posez une question…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className={styles.composerRow}>
        <span className={styles.composerHint}>Entrée pour envoyer · Maj+Entrée pour une ligne</span>
        <button type="button" className={styles.send} onClick={send} disabled={disabled}>
          Envoyer
        </button>
      </div>
    </div>
  )
}
