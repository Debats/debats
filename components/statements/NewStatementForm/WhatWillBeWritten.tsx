import styles from './NewStatementForm.module.css'

/** An entity the submission will create, named if it is named already */
export interface Created {
  /** Its label: « La personnalité », « L'organisation », « La position » */
  what: string
  name: string
}

interface WhatWillBeWrittenProps {
  created: readonly Created[]
}

/**
 * What the submission will write, said before the click.
 *
 * It all leaves in one transaction: if a field is refused, nothing is saved
 * and the form keeps everything. That is why this block announces and never
 * reports a half success — there is none.
 *
 * An entity being typed announces itself at once, named or not: waiting for
 * its name would hide a write that is going to happen anyway.
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
