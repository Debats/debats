import ComingSoon from '../../../../components/ui/ComingSoon'
import styles from './OrganisationsSoon.module.css'

/** Encart du rail annonçant les organisations (partis, ONG, syndicats…) sur un sujet. */
export default function OrganisationsSoon() {
  return (
    <ComingSoon block className={styles.card}>
      <p className={styles.title}>Organisations engagées</p>
      <p className={styles.text}>
        Partis, ONG, syndicats, entreprises et collectifs prendront bientôt position ici, aux côtés
        des personnalités.
      </p>
    </ComingSoon>
  )
}
