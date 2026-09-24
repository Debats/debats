import { ImageResponse } from 'next/og'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
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

export const alt = 'Sujet de débat'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const AVATARS_SHOWN = 8

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)
  const statementRepo = createStatementRepository(supabase)

  const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))

  if (!subject) {
    return new ImageResponse(<div>Sujet introuvable</div>, { ...size })
  }

  const statements = await Effect.runPromise(statementRepo.findBySubjectWithFigures(subject.id))

  const figuresMap = new Map<string, { name: string; slug: string }>()
  for (const s of statements) {
    if (!figuresMap.has(s.publicFigure.id)) {
      figuresMap.set(s.publicFigure.id, { name: s.publicFigure.name, slug: s.publicFigure.slug })
    }
  }
  const figures = Array.from(figuresMap.values())
  const positionsCount = new Set(statements.map((s) => s.position.id)).size

  const shown = figures.slice(0, AVATARS_SHOWN)
  const [fonts, brandMark, avatarEntries] = await Promise.all([
    loadOgFonts(),
    loadBrandMark(),
    Promise.all(shown.map((f) => loadAvatar(f.slug))),
  ])
  const avatars = shown
    .map((figure, index) => ({ slug: figure.slug, src: avatarEntries[index] }))
    .filter((a): a is { slug: string; src: string } => a.src !== null)

  return new ImageResponse(
    <OgFrame
      kicker="Sujet"
      brandMark={brandMark}
      footer={`${positionsCount} ${plural(positionsCount, 'position', 'positions')} · ${figures.length} ${plural(figures.length, 'personnalité', 'personnalités')}`}
    >
      <span
        style={{
          fontFamily: OG_FONTS.serif,
          fontSize: '72px',
          lineHeight: 1.05,
          color: OG_COLORS.ink,
        }}
      >
        {subject.title}
      </span>
      <span
        style={{
          fontFamily: OG_FONTS.serif,
          fontStyle: 'italic',
          fontSize: '32px',
          lineHeight: 1.3,
          color: OG_COLORS.ink2,
          marginTop: '18px',
        }}
      >
        {truncate(subject.problem, 170)}
      </span>

      {avatars.length > 0 && (
        <div
          style={{ display: 'flex', alignItems: 'center', marginTop: 'auto', paddingTop: '24px' }}
        >
          {avatars.map((avatar, index) => (
            <OgAvatar key={avatar.slug} src={avatar.src} size={64} overlap={index > 0} />
          ))}
          {figures.length > AVATARS_SHOWN && (
            <span style={{ fontSize: '24px', color: OG_COLORS.ink3, marginLeft: '14px' }}>
              {`+${figures.length - AVATARS_SHOWN}`}
            </span>
          )}
        </div>
      )}
    </OgFrame>,
    { ...size, fonts },
  )
}
