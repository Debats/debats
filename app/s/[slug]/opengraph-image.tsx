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
  loadLogo,
  loadOgFonts,
  truncate,
} from '../../../lib/og'
import { plural } from '../../../lib/plural'
import { StatementAuthorRef } from '../../../domain/read-models/statement-author'
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

  const statements = await Effect.runPromise(statementRepo.findBySubjectWithAuthors(subject.id))

  // Each author once, public figures first, in order of appearance
  const authorsMap = new Map<string, StatementAuthorRef>()
  for (const { author } of statements) {
    if (!authorsMap.has(`${author.kind}-${author.id}`)) {
      authorsMap.set(`${author.kind}-${author.id}`, author)
    }
  }
  const authors = Array.from(authorsMap.values()).sort((a, b) =>
    a.kind === b.kind ? 0 : a.kind === 'public_figure' ? -1 : 1,
  )
  const figuresCount = authors.filter((a) => a.kind === 'public_figure').length
  const organisationsCount = authors.length - figuresCount
  const positionsCount = new Set(statements.map((s) => s.position.id)).size

  const shown = authors.slice(0, AVATARS_SHOWN)
  const [fonts, brandMark, avatarEntries] = await Promise.all([
    loadOgFonts(),
    loadBrandMark(),
    Promise.all(
      shown.map((a) => (a.kind === 'organisation' ? loadLogo(a.slug) : loadAvatar(a.slug))),
    ),
  ])
  const avatars = shown
    .map((author, index) => ({ author, src: avatarEntries[index] }))
    .filter((a): a is { author: StatementAuthorRef; src: string } => a.src !== null)

  const footer = [
    `${positionsCount} ${plural(positionsCount, 'position', 'positions')}`,
    `${figuresCount} ${plural(figuresCount, 'personnalité', 'personnalités')}`,
    organisationsCount > 0
      ? `${organisationsCount} ${plural(organisationsCount, 'organisation', 'organisations')}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return new ImageResponse(
    <OgFrame kicker="Sujet" brandMark={brandMark} footer={footer}>
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
          {avatars.map(({ author, src }, index) => (
            <OgAvatar
              key={`${author.kind}-${author.id}`}
              src={src}
              size={64}
              overlap={index > 0}
              shape={author.kind === 'organisation' ? 'square' : 'round'}
            />
          ))}
          {authors.length > AVATARS_SHOWN && (
            <span style={{ fontSize: '24px', color: OG_COLORS.ink3, marginLeft: '14px' }}>
              {`+${authors.length - AVATARS_SHOWN}`}
            </span>
          )}
        </div>
      )}
    </OgFrame>,
    { ...size, fonts },
  )
}
