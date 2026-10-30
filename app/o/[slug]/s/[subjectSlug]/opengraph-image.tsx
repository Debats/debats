import { ImageResponse } from 'next/og'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../../../infra/database/organisation-repository-supabase'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'
import { contentLine } from '../../../../../domain/entities/statement'
import { loadBrandMark, loadLogo, loadOgFonts } from '../../../../../lib/og'
import { formatDate } from '../../../../../lib/format-date'
import OgAuthorOnSubject from '../../../../../components/og/OgAuthorOnSubject'
import OgFrame from '../../../../../components/og/OgFrame'

export const alt = 'Prises de position'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string; subjectSlug: string }>
}) {
  const { slug, subjectSlug } = await params

  const supabase = createAdminSupabaseClient()
  const statementRepo = createStatementRepository(supabase)

  const [organisation, subject] = await Promise.all([
    Effect.runPromise(createOrganisationRepository(supabase).findBySlug(slug)),
    Effect.runPromise(createSubjectRepository(supabase).findBySlug(subjectSlug)),
  ])

  if (!organisation || !subject) {
    return new ImageResponse(<div>Page introuvable</div>, { ...size })
  }

  const statements = await Effect.runPromise(
    statementRepo.findByOrganisationAndSubject(organisation.id, subject.id),
  )
  const first = statements[0] ?? null

  const [fonts, brandMark, logoSrc] = await Promise.all([
    loadOgFonts(),
    loadBrandMark(),
    loadLogo(slug),
  ])

  const footer = first
    ? [first.statement.sourceName, formatDate(first.statement.statedAt)].join(' · ')
    : undefined

  return new ImageResponse(
    <OgFrame kicker="Prise de position" brandMark={brandMark} footer={footer}>
      <OgAuthorOnSubject
        authorName={organisation.name}
        subjectTitle={subject.title}
        avatarSrc={logoSrc}
        shape="square"
        positionTitle={first?.position.title ?? null}
        quote={first ? contentLine(first.statement.content) : null}
      />
    </OgFrame>,
    { ...size, fonts },
  )
}
