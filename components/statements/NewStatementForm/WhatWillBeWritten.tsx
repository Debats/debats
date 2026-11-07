import styles from './NewStatementForm.module.css'

/** Une entité que l'envoi créera, nommée si elle l'est déjà */
export interface Created {
  /** « La personnalité », « L'organisation », « La position » */
  what: string
  name: string
}

interface WhatWillBeWrittenProps {
  created: readonly Created[]
}

/**
 * Ce que l'envoi va écrire, dit avant de cliquer.
 *
 * Tout part dans une seule transaction : si un champ est refusé, rien n'est
 * enregistré et le formulaire garde tout. C'est pour ça que l'encart annonce
 * sans jamais rendre compte d'un demi-succès — il n'y en a pas.
 *
 * Une entité en cours de saisie s'annonce aussitôt, nommée ou non : attendre
 * son nom ferait disparaître une écriture qui va bien avoir lieu.
 */
export default function WhatWillBeWritten({ created }: WhatWillBeWrittenProps) {
  return (
    <div className={styles.summary}>
      <p className={styles.summaryTitle}>Ce que l’envoi va écrire</p>
      <ul className={styles.summaryList}>
        {created.map(({ what, name }) => (
          <li key={what}>
            {name ? (
              <>
                {what} <strong>{name}</strong>
              </>
            ) : (
              `${what} que vous créez`
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
