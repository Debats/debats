import { Metadata } from "next"
import PageTitle from "../../components/ui/PageTitle"
import styles from "./credits.module.css"

export const metadata: Metadata = {
  title: "Crédits - Débats.co",
  description: "Les personnes et technologies derrière Débats.co.",
}

export default function CreditsPage() {
  return (
    <div className={styles.container}>
      <PageTitle>Crédits</PageTitle>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Contributeurs</h2>
        <ul className={styles.contributors}>
          <li className={styles.contributor}>
            <a href="https://marwann.com/" className={styles.contributorName} target="_blank" rel="noopener noreferrer">Marwann Al Saadi</a>
            <span className={styles.contributorRole}>Développement, contenu</span>
          </li>
          <li className={styles.contributor}>
            <a href="https://jalil.arfaoui.net/" className={styles.contributorName} target="_blank" rel="noopener noreferrer">Jalil Arfaoui</a>
            <span className={styles.contributorRole}>Conception, développement, architecture</span>
          </li>
          <li className={styles.contributor}>
            <a href="https://mehdi.arfaoui.net/" className={styles.contributorName} target="_blank" rel="noopener noreferrer">Mehdi Arfaoui</a>
            <span className={styles.contributorRole}>Développement, design</span>
          </li>
          <li className={styles.contributor}>
            <a href="https://www.linkedin.com/in/benjamin-filliol/" className={styles.contributorName} target="_blank" rel="noopener noreferrer">Benjamin Filliol</a>
            <span className={styles.contributorRole}>Développement, contenu</span>
          </li>
          <li className={styles.contributor}>
            <a href="https://fr.wikipedia.org/wiki/Quentin_Lafay" className={styles.contributorName} target="_blank" rel="noopener noreferrer">Quentin Lafay</a>
            <span className={styles.contributorRole}>Conception, stratégie, contenu</span>
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Historique du projet</h2>
        <p className={styles.text}>
          Débats.co est né en mars 2015. Le projet a connu plusieurs
          itérations avant d&apos;aboutir à la version actuelle.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Crédits photos</h2>
        <p className={styles.text}>
          Les photographies de personnalités publiques utilisées sur ce site
          proviennent de sources libres de droits ou sont utilisées dans le
          cadre du droit à l&apos;information. Si vous êtes titulaire de
          droits sur une image et souhaitez sa modification ou son retrait,
          contactez-nous à contact@debats.co.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Licence</h2>
        <p className={styles.text}>
          Le code source de Débats.co est disponible sous licence MIT.
          Le contenu éditorial est sous licence Creative Commons BY-SA.
        </p>
      </section>
    </div>
  )
}
