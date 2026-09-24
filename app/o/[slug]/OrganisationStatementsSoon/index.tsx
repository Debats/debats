import ComingSoon from '../../../../components/ui/ComingSoon'
import styles from './OrganisationStatementsSoon.module.css'

/** Encart du rail annonçant les prises de position de l'organisation elle-même. */
export default function OrganisationStatementsSoon() {
  return (
    <ComingSoon as="div" className={styles.card}>
      <p className={styles.title}>Prises de position</p>
      <p className={styles.text}>
        Communiqués, programmes, votes et actions de l&apos;organisation seront bientôt recensés
        ici, sujet par sujet, aux côtés de ceux de ses membres.
      </p>
    </ComingSoon>
  )
}
