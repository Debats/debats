import { ReactNode } from 'react'
import styles from './NewStatementForm.module.css'

interface PanelProps {
  /** Ce qu'on crée : « Nouvelle personnalité », « Nouvelle position » */
  title: string
  /** Ce que l'annulation rend : « choisir une personnalité existante » */
  instead: string
  onCancel: () => void
  children: ReactNode
}

/**
 * Le cadre d'une entité créée en place, partagé par les trois panneaux.
 *
 * La note est tournée sans participe — « en même temps que » plutôt que
 * « écrite avec » — pour que le cadre ne s'accorde avec rien : les trois
 * entités actuelles sont féminines, un sujet ne le sera pas.
 *
 * Chacun tient ses champs ; ce qu'ils ont en commun est le cadre et la sortie —
 * le rappel que rien n'est écrit avant l'envoi, et le moyen de refermer sans
 * perdre ce qu'on a tapé.
 */
export default function Panel({ title, instead, onCancel, children }: PanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <p className={styles.panelTitle}>{title}</p>
        <p className={styles.panelNote}>en même temps que votre prise de position</p>
      </div>

      {children}

      <button type="button" className={styles.panelCancel} onClick={onCancel}>
        Annuler et {instead}
      </button>
    </div>
  )
}
