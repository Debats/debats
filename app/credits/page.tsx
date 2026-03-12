import { Metadata } from 'next'
import PageTitle from '../../components/ui/PageTitle'
import styles from './credits.module.css'

export const metadata: Metadata = {
  title: 'Crédits',
  description: 'Les personnes et technologies derrière Débats.co.',
}

const contributors = [
  { name: 'Marwann Al Saadi', url: 'https://marwann.com/', role: 'Développement, contenu' },
  {
    name: 'Jalil Arfaoui',
    url: 'https://jalil.arfaoui.net/',
    role: 'Conception, développement, architecture',
  },
  { name: 'Mehdi Arfaoui', url: 'https://mehdi.arfaoui.net/', role: 'Développement, design' },
  {
    name: 'Benjamin Filliol',
    url: 'https://www.linkedin.com/in/benjamin-filliol/',
    role: 'Développement, contenu',
  },
  {
    name: 'Quentin Lafay',
    url: 'https://fr.wikipedia.org/wiki/Quentin_Lafay',
    role: 'Conception, stratégie, contenu',
  },
  {
    name: 'Hugo Vergès',
    url: 'mailto:hugo.verges@gmail.com',
    role: 'Conception, stratégie, contenu',
  },
]

function Contributor({ name, url, role }: { name: string; url: string; role: string }) {
  const isExternal = !url.startsWith('mailto:')
  return (
    <li className={styles.contributor}>
      <a
        href={url}
        className={styles.contributorName}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {name}
      </a>
      <span className={styles.contributorRole}>{role}</span>
    </li>
  )
}

export default function CreditsPage() {
  return (
    <div className={styles.container}>
      <PageTitle>Crédits</PageTitle>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Contributeurs</h2>
        <ul className={styles.contributors}>
          {contributors.map((c) => (
            <Contributor key={c.name} {...c} />
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Historique du projet</h2>
        <p className={styles.text}>
          Débats.co est né en mars 2015. Le projet a connu plusieurs itérations avant d&apos;aboutir
          à la version actuelle.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Crédits photos</h2>
        <p className={styles.text}>
          Les photographies de personnalités publiques utilisées sur ce site proviennent de sources
          libres de droits ou sont utilisées dans le cadre du droit à l&apos;information. Si vous
          êtes titulaire de droits sur une image et souhaitez sa modification ou son retrait,
          contactez-nous à <a href="mailto:contact@debats.co">contact@debats.co</a>.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Licence</h2>
        <p className={styles.text}>
          Le code source de Débats.co est disponible sous licence MIT. Le contenu éditorial est sous
          licence Creative Commons BY-SA.
        </p>
      </section>
    </div>
  )
}
