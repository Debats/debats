import { ImageResponse } from 'next/og'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'
import { loadAvatar, loadBrandMark, loadOgFonts } from '../../../../../lib/og'
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
  const figureRepo = createPublicFigureRepository(supabase)
  const subjectRepo = createSubjectRepository(supabase)
  const statementRepo = createStatementRepository(supabase)

  const [figure, subject] = await Promise.all([
    Effect.runPromise(figureRepo.findBySlug(slug)),
    Effect.runPromise(subjectRepo.findBySlug(subjectSlug)),
  ])

  if (!figure || !subject) {
    return new ImageResponse(<div>Page introuvable</div>, { ...size })
  }

  const statements = await Effect.runPromise(
    statementRepo.findByPublicFigureAndSubject(figure.id, subject.id),
  )
  const first = statements[0] ?? null

  const [fonts, brandMark, avatarSrc] = await Promise.all([
    loadOgFonts(),
    loadBrandMark(),
    loadAvatar(slug),
  ])

  const footer = first
    ? [first.statement.sourceName, formatDate(first.statement.statedAt)].join(' · ')
    : undefined

  return new ImageResponse(
    <OgFrame kicker="Prise de position" brandMark={brandMark} footer={footer}>
      <OgAuthorOnSubject
        authorName={figure.name}
        subjectTitle={subject.title}
        avatarSrc={avatarSrc}
        shape="round"
        positionTitle={first?.position.title ?? null}
        quote={first?.statement.quote ?? null}
      />
    </OgFrame>,
    { ...size, fonts },
  )
}
