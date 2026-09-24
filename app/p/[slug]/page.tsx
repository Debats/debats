import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import { createThemeRepository } from '../../../infra/database/theme-repository-supabase'
import { StatementWithDetails } from '../../../domain/repositories/statement-repository'
import {
  activityPeriod,
  statementsPerYear,
  themeDistribution,
} from '../../../domain/services/figure-activity'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import { canPerform } from '../../../domain/reputation/permissions'
import AdminMenu from '../../../components/ui/AdminMenu'
import Button from '../../../components/ui/Button'
import SectionTabs from '../../../components/ui/SectionTabs'
import ShareButton from '../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import FigureHero from './FigureHero'
import FigureStatements, { SubjectGroup } from './FigureStatements'
import FigureAnalyses from './FigureAnalyses'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const publicFigureRepo = createPublicFigureRepository(supabase)
    const figure = await Effect.runPromise(publicFigureRepo.findBySlug(slug))
    if (!figure) return { title: 'Personnalité introuvable' }
    const description = figure.presentation
      ? `${figure.name} - ${figure.presentation}`
      : `Positions et prises de position de ${figure.name} sur les sujets de société.`
    const url = `/p/${slug}`
    return {
      title: figure.name,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: figure.name,
        description,
        type: 'profile',
        url,
      },
      twitter: {
        card: 'summary_large_image',
        title: figure.name,
        description,
      },
    }
  } catch {
    return { title: 'Personnalité' }
  }
}

/** Groupe les prises de position par sujet, du sujet le plus récemment abordé au plus ancien. */
function groupBySubject(statements: StatementWithDetails[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>()
  for (const { statement, position, subject } of statements) {
    const group = groups.get(subject.id) ?? { subject, entries: [] }
    group.entries.push({ statement, position })
    groups.set(subject.id, group)
  }
  const latest = (group: SubjectGroup) =>
    Math.max(...group.entries.map((e) => e.statement.createdAt.getTime()))
  return Array.from(groups.values()).sort((a, b) => latest(b) - latest(a))
}

export default async function PersonalityDetailPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = createAdminSupabaseClient()
  const publicFigureRepo = createPublicFigureRepository(supabase)
  const statementRepo = createStatementRepository(supabase)
  const themeRepo = createThemeRepository(supabase)

  const figure = await Effect.runPromise(publicFigureRepo.findBySlug(slug))

  if (!figure) notFound()

  const [statements, contributor, themes, primaryLinks] = await Promise.all([
    Effect.runPromise(statementRepo.findByPublicFigureWithDetails(figure.id)),
    getAuthenticatedContributor(),
    Effect.runPromise(themeRepo.findAll()),
    Effect.runPromise(themeRepo.findAllPrimaryLinks()),
  ])

  const groups = groupBySubject(statements)
  const statedDates = statements.map(({ statement }) => statement.statedAt)
  const subjectIds = groups.map(({ subject }) => subject.id)
  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_personality')

  const links = [
    ...(Option.isSome(figure.wikipediaUrl)
      ? [{ href: figure.wikipediaUrl.value, label: 'Wikipédia' }]
      : []),
    ...(Option.isSome(figure.websiteUrl)
      ? [{ href: figure.websiteUrl.value, label: 'Site officiel' }]
      : []),
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: figure.name,
    description: figure.presentation,
    url: `https://debats.co/p/${figure.slug}`,
    image: `https://debats.co/avatars/${figure.slug}.jpg`,
    ...(Option.isSome(figure.wikipediaUrl) ? { sameAs: [figure.wikipediaUrl.value] } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FigureHero
        slug={figure.slug}
        name={figure.name}
        presentation={figure.presentation}
        links={links}
        counts={{
          statements: statements.length,
          subjects: groups.length,
          period: activityPeriod(statedDates),
        }}
        adminMenu={
          canEdit && (
            <AdminMenu actions={[{ label: 'Modifier', icon: '✎', href: `/p/${slug}/modifier` }]} />
          )
        }
        actions={
          <>
            {contributor ? (
              <Button
                href={`/nouvelle-prise-de-position?figureId=${figure.id}&figureName=${encodeURIComponent(figure.name)}`}
              >
                Ajouter une prise de position
              </Button>
            ) : (
              <Button href="/contribuer">Ajouter une prise de position</Button>
            )}
            <ShareButton compact title={figure.name} />
          </>
        }
      />

      <ContentWithSidebar
        topMargin
        aside={
          <FigureAnalyses
            themes={themeDistribution(subjectIds, primaryLinks, themes)}
            perYear={statementsPerYear(statedDates)}
          />
        }
      >
        <SectionTabs
          ariaLabel="Sections de la personnalité"
          active="Prises de position"
          tabs={[
            { label: 'Prises de position', count: statements.length },
            { label: 'Analyses', soon: true },
          ]}
        />
        <FigureStatements figureSlug={slug} groups={groups} />
      </ContentWithSidebar>
    </>
  )
}
