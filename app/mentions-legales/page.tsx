import { Metadata } from 'next'
import PageTitle from '../../components/ui/PageTitle'
import styles from './mentions-legales.module.css'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales du site Débats.co.',
}

export default function MentionsLegalesPage() {
  return (
    <div className={styles.container}>
      <PageTitle>Mentions légales</PageTitle>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Éditeur</h2>
        <p className={styles.text}>Le site debats.co est un projet collaboratif bénévole.</p>
        <p className={styles.text}>Directeur de la publication : Jalil Arfaoui</p>
        <p className={styles.text}>
          Contact : <a href="mailto:contact@debats.co">contact@debats.co</a>
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Hébergement</h2>
        <p className={styles.text}>
          Ce site est hébergé par Clever Cloud SAS, 3 rue de l&apos;Allier, 44000 Nantes, France.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Propriété intellectuelle</h2>
        <p className={styles.text}>
          Le{' '}
          <a href="https://forge.tiqa.fr/debats/debats" target="_blank" rel="noopener noreferrer">
            code source
          </a>{' '}
          de Débats.co est disponible sous licence MIT. Le contenu éditorial est sous licence
          Creative Commons BY-SA 4.0.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Données personnelles</h2>
        <p className={styles.text}>
          Ce site ne collecte aucune donnée personnelle à des fins commerciales. Les données
          éventuellement recueillies dans le cadre de la création d&apos;un compte utilisateur sont
          utilisées uniquement pour le fonctionnement du service et ne sont pas transmises à des
          tiers.
        </p>
        <p className={styles.text}>
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
          d&apos;un droit d&apos;accès, de rectification et de suppression de vos données. Pour
          exercer ces droits, contactez-nous à{' '}
          <a href="mailto:contact@debats.co">contact@debats.co</a>.
        </p>
      </section>
    </div>
  )
}
