import { Metadata } from 'next'
import Link from 'next/link'
import PageTitle from '../../components/ui/PageTitle'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { getRank } from '../../domain/reputation/permissions'
import styles from './contribuer.module.css'

export const metadata: Metadata = {
  title: 'Contribuer',
  description:
    'Contribuez à Débats.co : ajoutez des prises de position, des sujets et des personnalités publiques.',
}

export default async function ContribuerPage() {
  const contributor = await getAuthenticatedContributor()

  return (
    <div className={styles.container}>
      <PageTitle>Contribuer</PageTitle>

      <p className={styles.intro}>
        Débats.co est une plateforme collaborative. Les contributeurs ne donnent pas leur avis : ils
        recherchent, collectent et recensent les positions exprimées par des personnalités publiques
        sur des sujets de société.
      </p>

      <h2 className={styles.sectionTitle}>Comment contribuer ?</h2>

      <ul className={styles.steps}>
        <li>
          <strong>Recenser une prise de position</strong> : trouvez une déclaration publique
          d&apos;une personnalité sur un sujet et ajoutez-la avec sa source.
        </li>
        <li>
          <strong>Ajouter un sujet ou une personnalité</strong> : à partir d&apos;un certain niveau
          de réputation, vous pouvez enrichir la base.
        </li>
        <li>
          <strong>Sourcer</strong> : chaque prise de position doit être appuyée par au moins une
          source vérifiable (article, vidéo, livre).
        </li>
      </ul>

      {contributor ? (
        <p className={styles.reputation}>
          Votre réputation : {contributor.reputation}. Vous êtes un{' '}
          {getRank(contributor.reputation)}.
        </p>
      ) : (
        <div className={styles.signupCta}>
          <p>
            Pour contribuer, vous devez être invité·e par un contributeur existant. Vous pouvez
            aussi vous inscrire en liste d&apos;attente pour être informé·e de l&apos;ouverture à toutes et tous.
          </p>
          <Link href="/inscription" className={styles.signupLink}>
            S&apos;inscrire en liste d&apos;attente
          </Link>
        </div>
      )}

      <h2 className={styles.sectionTitle}>Qu&apos;est-ce que la réputation ?</h2>

      <p className={styles.intro}>
        Chaque contribution vous rapporte des points de réputation. Plus votre réputation augmente,
        plus vous débloquez de fonctionnalités : ajouter des sujets, des personnalités, inviter
        d&apos;autres contributeurs, et modérer le contenu existant.
      </p>

      <p className={styles.guideLinkWrapper}>
        <Link href="/guide" className={styles.guideLink}>
          Lire le mode d&apos;emploi complet
        </Link>
      </p>

      <h2 className={styles.sectionTitle}>Contribuer autrement</h2>

      <p className={styles.intro}>
        Débats.co est un projet open source. Vous pouvez aussi contribuer en améliorant le code, en
        signalant des bugs ou en proposant de nouvelles fonctionnalités sur{' '}
        <a href="https://forge.tiqa.fr/debats/debats">le dépôt source</a>. Toute aide est la
        bienvenue : développement, design, traduction, documentation.
      </p>
    </div>
  )
}
