import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'
import { publicFigureAuthor } from '../../../../../domain/entities/statement'
import { publicFigureRef } from '../../../../../domain/read-models/statement-author'
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, subjectSlug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const [figure, subject] = await Promise.all([
      Effect.runPromise(createPublicFigureRepository(supabase).findBySlug(slug)),
      Effect.runPromise(createSubjectRepository(supabase).findBySlug(subjectSlug)),
    ])
    if (!figure || !subject) return { title: 'Page introuvable' }
    return authorOnSubjectMetadata(publicFigureRef(figure), subject)
  } catch {
    return { title: 'Prises de position' }
  }
}

export default async function FigureSubjectPage({ params }: PageProps) {
  const { slug, subjectSlug } = await params

  const supabase = createAdminSupabaseClient()
  const statementRepo = createStatementRepository(supabase)

  const [figure, subject] = await Promise.all([
    Effect.runPromise(createPublicFigureRepository(supabase).findBySlug(slug)),
    Effect.runPromise(createSubjectRepository(supabase).findBySlug(subjectSlug)),
  ])

  if (!figure || !subject) notFound()

  const [figureStatements, subjectStatements, contributor] = await Promise.all([
    Effect.runPromise(statementRepo.findByPublicFigureAndSubject(figure.id, subject.id)),
    Effect.runPromise(statementRepo.findBySubjectWithAuthors(subject.id)),
    getAuthenticatedContributor(),
  ])

  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_statement')
  const author = publicFigureRef(figure)
  const positions = groupStatementsByPosition(figureStatements)
  const company = groupSubjectCompany(
    subjectStatements,
    publicFigureAuthor(figure.id),
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
          statements: figureStatements.length,
          positions: positions.length,
          allies: countAllies(company),
        }}
        actions={<ShareButton compact title={`${figure.name} sur ${subject.title}`} />}
      />
      <AuthorOnSubject
        subject={subject}
        positions={positions}
        company={company}
        editHref={
          canEdit
            ? (statementId) => `/p/${slug}/s/${subjectSlug}/modifier/${statementId}`
            : undefined
        }
      />
    </>
  )
}
