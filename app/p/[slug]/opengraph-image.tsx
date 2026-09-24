import { ImageResponse } from 'next/og'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import {
  OG_COLORS,
  OG_FONTS,
  loadAvatar,
  loadBrandMark,
  loadOgFonts,
  truncate,
} from '../../../lib/og'
import { plural } from '../../../lib/plural'
import OgAvatar from '../../../components/og/OgAvatar'
import OgFrame from '../../../components/og/OgFrame'

export const alt = 'Personnalité'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const SUBJECTS_SHOWN = 6

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabase = createAdminSupabaseClient()
  const figureRepo = createPublicFigureRepository(supabase)
  const statementRepo = createStatementRepository(supabase)

  const figure = await Effect.runPromise(figureRepo.findBySlug(slug))

  if (!figure) {
    return new ImageResponse(<div>Personnalité introuvable</div>, { ...size })
  }

  const statements = await Effect.runPromise(statementRepo.findByPublicFigureWithDetails(figure.id))

  const subjectsMap = new Map<string, string>()
  for (const s of statements) {
    if (!subjectsMap.has(s.subject.id)) subjectsMap.set(s.subject.id, s.subject.title)
  }
  const subjectTitles = Array.from(subjectsMap.values())

  const [fonts, brandMark, avatarSrc] = await Promise.all([
    loadOgFonts(),
    loadBrandMark(),
    loadAvatar(slug),
  ])

  return new ImageResponse(
    <OgFrame
      kicker="Personnalité"
      brandMark={brandMark}
      footer={`${statements.length} ${plural(statements.length, 'prise de position', 'prises de position')} sur ${subjectTitles.length} ${plural(subjectTitles.length, 'sujet', 'sujets')}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
        {avatarSrc && <OgAvatar src={avatarSrc} size={180} />}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span
            style={{
              fontFamily: OG_FONTS.serif,
              fontSize: '72px',
              lineHeight: 1.05,
              color: OG_COLORS.ink,
            }}
          >
            {figure.name}
          </span>
          {figure.presentation && (
            <span
              style={{
                fontSize: '28px',
                lineHeight: 1.4,
                color: OG_COLORS.ink2,
                marginTop: '12px',
              }}
            >
              {truncate(figure.presentation, 120)}
            </span>
          )}
        </div>
      </div>

      {subjectTitles.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: 'auto',
            paddingTop: '28px',
          }}
        >
          {subjectTitles.slice(0, SUBJECTS_SHOWN).map((title) => (
            <span
              key={title}
              style={{
                fontFamily: OG_FONTS.serif,
                fontSize: '24px',
                color: OG_COLORS.ink,
                backgroundColor: OG_COLORS.card,
                padding: '8px 18px',
                borderRadius: '999px',
              }}
            >
              {title}
            </span>
          ))}
          {subjectTitles.length > SUBJECTS_SHOWN && (
            <span style={{ fontSize: '24px', color: OG_COLORS.ink3, padding: '8px 10px' }}>
              {`+${subjectTitles.length - SUBJECTS_SHOWN}`}
            </span>
          )}
        </div>
      )}
    </OgFrame>,
    { ...size, fonts },
  )
}
