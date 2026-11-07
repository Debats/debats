import styles from './NewStatementForm.module.css'

/** Une entité que l'envoi ouvrira, nommée si elle l'est déjà */
export interface Opened {
  /** « La personnalité », « L'organisation », « La position » */
  what: string
  name: string
}

interface WhatWillBeWrittenProps {
  opened: readonly Opened[]
}

/**
 * Ce que l'envoi va écrire, dit avant de cliquer.
 *
 * Tout part dans une seule transaction : si un champ est refusé, rien n'est
 * enregistré et le formulaire garde tout. C'est pour ça que l'encart annonce
 * sans jamais rendre compte d'un demi-succès — il n'y en a pas.
 *
 * Une entité ouverte s'annonce dès qu'elle l'est, nommée ou non : attendre son
 * nom ferait disparaître une écriture qui va bien avoir lieu.
 */
export default function WhatWillBeWritten({ opened }: WhatWillBeWrittenProps) {
  return (
    <div className={styles.summary}>
      <p className={styles.summaryTitle}>Ce que l’envoi va écrire</p>
      <ul className={styles.summaryList}>
        {opened.map(({ what, name }) => (
          <li key={what}>
            {name ? (
              <>
                {what} <strong>{name}</strong>
              </>
            ) : (
              `${what} que vous ouvrez`
            )}
          </li>
        ))}
        <li>Votre prise de position</li>
      </ul>
      <p className={styles.summaryNote}>
        En une seule écriture : si quelque chose est refusé, rien n’est enregistré et vous gardez
        tout ce que vous avez saisi.
      </p>
    </div>
  )
}
