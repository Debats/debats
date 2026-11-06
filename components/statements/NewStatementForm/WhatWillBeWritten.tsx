import styles from './NewStatementForm.module.css'

interface WhatWillBeWrittenProps {
  /** Une position est en cours d'ouverture, titrée ou pas encore */
  opening: boolean
  positionTitle: string
}

/**
 * Ce que l'envoi va écrire, dit avant de cliquer.
 *
 * Tout part dans une seule transaction : si un champ est refusé, rien n'est
 * enregistré et le formulaire garde tout. C'est pour ça que l'encart annonce
 * sans jamais rendre compte d'un demi-succès — il n'y en a pas.
 *
 * Une position ouverte s'annonce dès qu'elle l'est, titrée ou non : annoncer
 * seulement une fois le titre tapé ferait disparaître une écriture qui va
 * bien avoir lieu.
 */
export default function WhatWillBeWritten({ opening, positionTitle }: WhatWillBeWrittenProps) {
  return (
    <div className={styles.summary}>
      <p className={styles.summaryTitle}>Ce que l’envoi va écrire</p>
      <ul className={styles.summaryList}>
        {opening && (
          <li>
            {positionTitle ? (
              <>
                La position <strong>{positionTitle}</strong>
              </>
            ) : (
              'La position que vous ouvrez'
            )}
          </li>
        )}
        <li>Votre prise de position, sur cette position</li>
      </ul>
      <p className={styles.summaryNote}>
        En une seule écriture : si quelque chose est refusé, rien n’est enregistré et vous gardez
        tout ce que vous avez saisi.
      </p>
    </div>
  )
}
