import { ImageResponse } from 'next/og'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'
import {
  OG_COLORS,
  OG_FONTS,
  loadAvatar,
  loadBrandMark,
  loadOgFonts,
  truncate,
} from '../../../../../lib/og'
import { formatDate } from '../../../../../lib/format-date'
import OgAvatar from '../../../../../components/og/OgAvatar'
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
  const positionTitle = first?.position.title ?? null
  const statement = first?.statement ?? null

  const [fonts, brandMark, avatarSrc] = await Promise.all([
    loadOgFonts(),
    loadBrandMark(),
    loadAvatar(slug),
  ])

  const footer = statement
    ? [statement.sourceName, formatDate(statement.statedAt)].join(' · ')
    : undefined

  return new ImageResponse(
    <OgFrame kicker="Prise de position" brandMark={brandMark} footer={footer}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        {avatarSrc && <OgAvatar src={avatarSrc} size={120} />}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: OG_FONTS.serif,
              fontSize: '56px',
              lineHeight: 1.05,
              color: OG_COLORS.ink,
            }}
          >
            {figure.name}
          </span>
          <span
            style={{
              fontFamily: OG_FONTS.serif,
              fontStyle: 'italic',
              fontSize: '30px',
              color: OG_COLORS.ink2,
              marginTop: '6px',
            }}
          >
            {`sur ${subject.title}`}
          </span>
        </div>
      </div>

      {positionTitle && (
        <span
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: OG_COLORS.ink,
            marginTop: '28px',
          }}
        >
          {positionTitle}
        </span>
      )}
      {statement && (
        <span
          style={{
            fontFamily: OG_FONTS.serif,
            fontSize: '34px',
            lineHeight: 1.35,
            color: OG_COLORS.ink,
            marginTop: '12px',
          }}
        >
          {truncate(statement.quote, 170)}
        </span>
      )}
    </OgFrame>,
    { ...size, fonts },
  )
}
