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
  countAllies,
  groupStatementsByPosition,
  groupSubjectCompany,
} from '../../../../../domain/services/author-on-subject'
import { getAuthenticatedContributor } from '../../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../../domain/reputation/permissions'
import {
  authorOnSubjectJsonLd,
  authorOnSubjectMetadata,
} from '../../../../../lib/author-on-subject-seo'
import ShareButton from '../../../../../components/ui/ShareButton'
import AuthorOnSubject from '../../../../../components/statements/AuthorOnSubject'
import AuthorSubjectHero from '../../../../../components/statements/AuthorSubjectHero'

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
  try {
    const supabase = createAdminSupabaseClient()
    const [organisation, subject] = await Promise.all([
      Effect.runPromise(createOrganisationRepository(supabase).findBySlug(slug)),
      Effect.runPromise(createSubjectRepository(supabase).findBySlug(subjectSlug)),
    ])
    if (!organisation || !subject) return { title: 'Page introuvable' }
    return authorOnSubjectMetadata(toAuthorRef(organisation), subject)
  } catch {
    return { title: 'Prises de position' }
  }
}

export default async function OrganisationSubjectPage({ params }: PageProps) {
  const { slug, subjectSlug } = await params

  const supabase = createAdminSupabaseClient()
  const statementRepo = createStatementRepository(supabase)

  const [organisation, subject] = await Promise.all([
    Effect.runPromise(createOrganisationRepository(supabase).findBySlug(slug)),
    Effect.runPromise(createSubjectRepository(supabase).findBySlug(subjectSlug)),
  ])

  if (!organisation || !subject) notFound()

  const [organisationStatements, subjectStatements, contributor] = await Promise.all([
    Effect.runPromise(statementRepo.findByOrganisationAndSubject(organisation.id, subject.id)),
    Effect.runPromise(statementRepo.findBySubjectWithAuthors(subject.id)),
    getAuthenticatedContributor(),
  ])

  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_statement')
  const author = toAuthorRef(organisation)
  const positions = groupStatementsByPosition(organisationStatements)
  const company = groupSubjectCompany(
    subjectStatements,
    organisationAuthor(organisation.id),
    new Set(positions.map(({ position }) => position.id)),
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorOnSubjectJsonLd(author, subject)) }}
      />
      <AuthorSubjectHero
        author={author}
        subject={subject}
        counts={{
          statements: organisationStatements.length,
          positions: positions.length,
          allies: countAllies(company),
        }}
        actions={<ShareButton compact title={`${organisation.name} sur ${subject.title}`} />}
      />
      <AuthorOnSubject
        subject={subject}
        positions={positions}
        company={company}
        editHref={
          canEdit ? (statementId) => `/prise-de-position/${statementId}/modifier` : undefined
        }
      />
    </>
  )
}
