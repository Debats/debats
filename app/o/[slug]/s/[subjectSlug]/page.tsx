import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../../../infra/database/organisation-repository-supabase'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'
import { Organisation } from '../../../../../domain/entities/organisation'
import { organisationAuthor } from '../../../../../domain/entities/statement'
import { organisationRef } from '../../../../../domain/read-models/statement-author'
import {
  countStatements,
  countSubjectVoices,
  countUndefended,
  debateOnSubject,
  groupStatementsByPosition,
  groupSubjectCompany,
  latestStatedAt,
} from '../../../../../domain/services/author-on-subject'
import { loadOrganisationSubjectPage } from '../../../../../infra/queries/author-subject-page'
import { getAuthenticatedContributor } from '../../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../../domain/reputation/permissions'
import {
  authorOnSubjectJsonLd,
  authorOnSubjectMetadata,
} from '../../../../../lib/author-on-subject-seo'
import ShareButton from '../../../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../../../components/layout/ContentWithSidebar'
import AuthorSubjectHero from '../../../../../components/statements/AuthorSubjectHero'
import OrganisationRoleLine from '../../../../../components/statements/AuthorSubjectHero/OrganisationRoleLine'
import AuthorPositions from '../../../../../components/statements/AuthorSubjectBlocks/AuthorPositions'
import AuthorRailCard from '../../../../../components/statements/AuthorSubjectBlocks/AuthorRailCard'
import ContributeCard from '../../../../../components/statements/AuthorSubjectBlocks/ContributeCard'
import NeighbourSubjects from '../../../../../components/statements/AuthorSubjectBlocks/NeighbourSubjects'
import OrganisationRailLines from '../../../../../components/statements/AuthorSubjectBlocks/OrganisationRailLines'
import PositionAlignment from '../../../../../components/statements/AuthorSubjectBlocks/PositionAlignment'
import SubjectDebate from '../../../../../components/statements/AuthorSubjectBlocks/SubjectDebate'
import SubjectRailCard from '../../../../../components/statements/AuthorSubjectBlocks/SubjectRailCard'
import SubjectSynthesis from '../../../../../components/statements/AuthorSubjectBlocks/SubjectSynthesis'

interface PageProps {
  params: Promise<{ slug: string; subjectSlug: string }>
}

const toAuthorRef = (organisation: Organisation) =>
  organisationRef({
    id: organisation.id,
    name: organisation.name,
    slug: organisation.slug,
    acronym: Option.getOrNull(organisation.acronym),
  })

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, subjectSlug } = await params
  const supabase = createAdminSupabaseClient()
  const [organisation, subject] = await Promise.all([
    Effect.runPromise(createOrganisationRepository(supabase).findBySlug(slug)),
    Effect.runPromise(createSubjectRepository(supabase).findBySlug(subjectSlug)),
  ])
  if (!organisation || !subject) return { title: 'Page introuvable' }
  return authorOnSubjectMetadata(toAuthorRef(organisation), subject)
}

/**
 * Une organisation sur un sujet.
 *
 * Même ordre de lecture que la page d'une personnalité, et les mêmes blocs,
 * mais pas le même assemblage : une organisation se présente par son type
 * et ses membres, et elle ne se compare qu'à ses propres membres — elle n'a
 * ni métier ni affiliation.
 */
export default async function OrganisationSubjectPage({ params }: PageProps) {
  const { slug, subjectSlug } = await params

  const supabase = createAdminSupabaseClient()
  const statementRepo = createStatementRepository(supabase)

  const [organisation, subject] = await Promise.all([
    Effect.runPromise(createOrganisationRepository(supabase).findBySlug(slug)),
    Effect.runPromise(createSubjectRepository(supabase).findBySlug(subjectSlug)),
  ])

  if (!organisation || !subject) notFound()

  const [organisationStatements, contributor] = await Promise.all([
    Effect.runPromise(statementRepo.findByOrganisationAndSubject(organisation.id, subject.id)),
    getAuthenticatedContributor(),
  ])

  const author = toAuthorRef(organisation)
  const positions = groupStatementsByPosition(organisationStatements)
  const hers = new Set(positions.map(({ position }) => position.id))

  // Le jour vient du bord : le domaine ne lit aucune horloge
  const page = await loadOrganisationSubjectPage(supabase, author, subject, hers, new Date())
  const company = groupSubjectCompany(page.everyone, organisationAuthor(organisation.id), hers)
  const debate = debateOnSubject(page.positions, page.everyone, hers)

  const statements = countStatements(positions)
  const voices = countSubjectVoices(page.everyone)
  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_statement')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorOnSubjectJsonLd(author, subject)) }}
      />
      <AuthorSubjectHero
        author={author}
        subject={subject}
        role={
          <OrganisationRoleLine
            organisationType={organisation.organisationType}
            members={page.members}
          />
        }
        counts={{
          statements,
          positions: positions.length,
          allies: page.alignment.everyone.withAuthor,
          openPositions: page.positions.length,
        }}
        actions={<ShareButton compact title={`${organisation.name} sur ${subject.title}`} />}
      />

      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <>
            <SubjectRailCard
              subject={subject}
              facts={{ positions: page.positions.length, voices, span: page.span }}
            />
            <AuthorRailCard author={author} subjects={page.subjects} statements={page.statements}>
              <OrganisationRailLines
                organisationType={organisation.organisationType}
                members={page.members}
              />
            </AuthorRailCard>
          </>
        }
      >
        <SubjectSynthesis
          authorName={author.name}
          subjectTitle={subject.title}
          statements={statements}
          positionTitles={positions.map(({ position }) => position.title)}
          allies={page.alignment.everyone.withAuthor}
          undefended={countUndefended(debate)}
          latest={latestStatedAt(positions)}
        />

        <AuthorPositions
          subjectSlug={subjectSlug}
          positions={positions}
          company={company}
          roles={page.roles}
          editHref={
            canEdit ? (statementId) => `/prise-de-position/${statementId}/modifier` : undefined
          }
        />

        {positions.length > 0 && (
          <PositionAlignment
            debate={debate}
            alignment={page.alignment}
            voices={voices}
            nobodyToCompare="Aucune autre voix de cette organisation n’a encore été recensée sur ce sujet : il n’y a personne à qui comparer cette position."
          />
        )}

        <SubjectDebate subjectSlug={subjectSlug} debate={debate} />

        <NeighbourSubjects author={author} neighbours={page.neighbours} />

        <ContributeCard authorName={author.name} statements={statements} />
      </ContentWithSidebar>
    </>
  )
}
