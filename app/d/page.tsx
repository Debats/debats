import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { loadJointDeclarationIndex } from '../../infra/queries/joint-declarations'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { canPerform } from '../../domain/reputation/permissions'
import {
  declarationsByYear,
  engagedSubjectsCount,
  signaturesCount,
} from '../../domain/read-models/joint-declaration'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import HeroStats from '../../components/layout/HeroStats'
import PageHero from '../../components/layout/PageHero'
import ReadingGuide from '../../components/layout/ReadingGuide'
import { plural } from '../../lib/plural'
import JointDeclarationCard from './JointDeclarationCard'
import ProposeJointDeclaration from './ProposeJointDeclaration'
import styles from './declarations.module.css'

export const metadata: Metadata = {
  title: 'Déclarations communes',
  description:
    'Tribunes, manifestes, appels, lettres ouvertes : qui signe quoi, et sur quels sujets. Chaque signature est une prise de position, sourcée et datée.',
}

export default async function JointDeclarationsPage() {
  const supabase = createAdminSupabaseClient()
  const [summaries, contributor] = await Promise.all([
    Effect.runPromise(loadJointDeclarationIndex(supabase)),
    getAuthenticatedContributor(),
  ])
  const years = declarationsByYear(summaries)
  const signatures = signaturesCount(summaries)
  const subjects = engagedSubjectsCount(summaries)
  const canPropose = !!contributor && canPerform(contributor.reputation, 'add_joint_declaration')

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Déclarations communes"
        intro="Tribunes, manifestes, appels, lettres ouvertes : qui signe quoi, et sur quels sujets ?"
        aside={
          summaries.length > 0 && (
            <HeroStats
              stats={[
                {
                  value: summaries.length,
                  label: plural(summaries.length, 'déclaration commune', 'déclarations communes'),
                },
                { value: signatures, label: plural(signatures, 'signature', 'signatures') },
                { value: subjects, label: plural(subjects, 'sujet engagé', 'sujets engagés') },
              ]}
            />
          )
        }
      />

      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <>
            <ReadingGuide
              title="Qu’est-ce qu’une déclaration commune ?"
              steps={[
                'Un texte public que plusieurs personnalités ou organisations signent ensemble.',
                'Chaque signature est une prise de position de son auteur·rice, sur chaque sujet que le texte engage.',
                'Signer n’est pas tout approuver : le site retient ce que le texte demande, pas ce qu’on lui prête.',
              ]}
            />
            <ProposeJointDeclaration canPropose={canPropose} />
          </>
        }
      >
        {years.length === 0 ? (
          <p className={styles.empty}>Aucune déclaration commune n’est encore recensée.</p>
        ) : (
          <div className={styles.years}>
            {years.map(({ year, declarations }) => (
              <section key={year} className={styles.year}>
                <h2 className={styles.yearTitle}>{year}</h2>
                {declarations.map((declaration) => (
                  <JointDeclarationCard key={declaration.id} declaration={declaration} />
                ))}
              </section>
            ))}
          </div>
        )}
      </ContentWithSidebar>
    </>
  )
}
