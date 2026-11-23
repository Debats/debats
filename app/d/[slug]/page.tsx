import { cache } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { loadJointDeclarationPage } from '../../../infra/queries/joint-declarations'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import { canPerform } from '../../../domain/reputation/permissions'
import { jointDeclarationHref } from '../../../domain/read-models/hrefs'
import { signatoriesLabel } from '../../../domain/read-models/joint-declaration'
import { feedHref } from '../../../domain/read-models/statement-feed'
import ActionLink from '../../../components/ui/ActionLink'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import HeroStats from '../../../components/layout/HeroStats'
import PageHero from '../../../components/layout/PageHero'
import ReadingGuide from '../../../components/layout/ReadingGuide'
import { formatDate } from '../../../lib/format-date'
import { plural } from '../../../lib/plural'
import AddSignature from './AddSignature'
import { jointDeclarationDescription } from './description'
import SignatoryCard from './SignatoryCard'
import TakenStanceCard from './TakenStanceCard'
import TextCard from './TextCard'
import styles from './joint-declaration.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

/** The page of a text, read once per render: its metadata and its body ask for the same thing */
const readPage = cache((slug: string) =>
  Effect.runPromise(loadJointDeclarationPage(createAdminSupabaseClient(), slug)),
)

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const page = await readPage(slug)
    if (!page) return { title: 'Déclaration commune introuvable' }
    const { declaration, signatories } = page
    const description = jointDeclarationDescription(
      declaration,
      signatories.map(({ author }) => author),
    )
    const url = jointDeclarationHref(declaration)
    return {
      title: `${declaration.title} — Déclaration commune`,
      description,
      alternates: { canonical: url },
      openGraph: { title: declaration.title, description, type: 'article', url },
    }
  } catch {
    return { title: 'Déclaration commune' }
  }
}

export default async function JointDeclarationPage({ params }: PageProps) {
  const { slug } = await params
  const [page, contributor] = await Promise.all([readPage(slug), getAuthenticatedContributor()])
  if (!page) notFound()

  const { declaration, stances, signatories } = page
  // A text whose subjects all left the site takes no position any more: there is nothing to sign
  const engaged = stances.length > 0
  const canSign = !!contributor && canPerform(contributor.reputation, 'add_statement')
  const canComplete = !!contributor && canPerform(contributor.reputation, 'add_joint_declaration')

  return (
    <>
      <PageHero
        kicker={`Déclaration commune · ${formatDate(declaration.declaredAt)}`}
        title={declaration.title}
        intro={declaration.presentation}
        aside={
          <HeroStats
            stats={[
              {
                value: signatories.length,
                label: plural(
                  signatories.length,
                  'signataire sur Débats.co',
                  'signataires sur Débats.co',
                ),
              },
              {
                value: stances.length,
                label: plural(stances.length, 'sujet engagé', 'sujets engagés'),
              },
            ]}
          />
        }
      />

      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <>
            <TextCard declaration={declaration} />
            <ReadingGuide
              title="Comment lire cette page"
              steps={[
                'Une déclaration commune est un texte que plusieurs personnes ou organisations signent ensemble.',
                'Chaque signature compte comme une prise de position de son auteur·rice, sur chaque position que le texte prend.',
                'Le site ne montre que les signataires qu’il a recensé·es. La liste complète est à la source.',
              ]}
            />
            <AddSignature
              declaration={declaration}
              engaged={engaged}
              canSign={canSign}
              canComplete={canComplete}
            />
          </>
        }
      >
        <section className={styles.block}>
          <div className={styles.head}>
            <h2 className={styles.title}>Ce que le texte défend</h2>
            <p className={styles.lead}>
              {engaged
                ? 'Signer ce texte, c’est prendre chacune de ces positions.'
                : 'Les sujets que ce texte engageait ne sont plus sur le site : il ne prend plus aucune position ici, et ne peut pas être signé tant qu’on ne lui en connaît pas une.'}
            </p>
          </div>
          {engaged && (
            <div className={styles.stances}>
              {stances.map((stance) => (
                <TakenStanceCard key={stance.position.id} stance={stance} />
              ))}
            </div>
          )}
        </section>

        <section className={styles.block}>
          <div className={styles.head}>
            <h2 className={styles.title}>Signataires recensé·es sur Débats.co</h2>
            <p className={styles.lead}>
              {signatories.length === 0
                ? 'Aucune signature n’est encore enregistrée pour ce texte.'
                : !engaged
                  ? `${signatoriesLabel(signatories.map(({ author }) => author))}.`
                  : `${signatoriesLabel(signatories.map(({ author }) => author))} : chacun·e prend ${
                      stances.length > 1 ? `les ${stances.length} positions` : 'la position'
                    } du texte.`}
            </p>
          </div>
          {signatories.length > 0 && (
            <ul className={styles.signatories}>
              {signatories.map((signatory) => (
                <li key={`${signatory.author.kind}-${signatory.author.id}`}>
                  <SignatoryCard signatory={signatory} />
                </li>
              ))}
            </ul>
          )}
          <p className={styles.lead}>
            Le site ne montre que les signatures qu’il a recensées.{' '}
            <a
              href={declaration.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceLink}
            >
              Voir le texte et ses signataires à la source
            </a>
          </p>
          {signatories.length > 0 && (
            <ActionLink href={feedHref({ jointDeclarationSlug: declaration.slug }, 'stated')}>
              Lire chaque signature dans le flux des prises de position
            </ActionLink>
          )}
        </section>
      </ContentWithSidebar>
    </>
  )
}
