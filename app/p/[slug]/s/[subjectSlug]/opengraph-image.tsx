import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'

export const alt = 'Prises de position'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

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

  const firstStatement = statements.length > 0 ? statements[0] : null
  const positionTitle = firstStatement?.position.title ?? null
  const st = firstStatement?.statement ?? null

  const quote = st?.quote ?? null
  const truncatedQuote = quote && quote.length > 160 ? quote.slice(0, 157) + '\u2026' : quote
  const sourceName = st?.sourceName ?? null
  const statementDate = st?.statedAt ?? null

  const [gothamBold, gothamBook, logoBuffer] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/Gotham-Bold.woff')),
    readFile(join(process.cwd(), 'public/fonts/Gotham-Book.woff')),
    readFile(join(process.cwd(), 'public/images/logo.png')),
  ])
  const logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:64321'
  const avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${slug}.jpg`
  let avatarSrc: string | null = null
  try {
    const res = await fetch(avatarUrl)
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer())
      avatarSrc = `data:image/jpeg;base64,${buffer.toString('base64')}`
    }
  } catch {
    // No avatar available
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: '#fff',
      }}
    >
      {/* Red left bar */}
      <div style={{ width: '8px', backgroundColor: '#f21e40', flexShrink: 0 }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '30px 35px 25px 35px',
          flex: 1,
        }}
      >
        {/* Top: avatar + name + subject */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          {avatarSrc && (
            <div
              style={{
                width: '170px',
                height: '170px',
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
              }}
            >
              <img src={avatarSrc} alt="" width={170} height={170} style={{ objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: 'Gotham Bold',
                fontSize: '58px',
                color: '#f21e40',
                textTransform: 'uppercase',
                lineHeight: 1.1,
              }}
            >
              {figure.name}
            </span>
            <span
              style={{
                fontFamily: 'Gotham Book',
                fontSize: '34px',
                color: '#666',
                marginTop: '8px',
              }}
            >
              {`sur ${subject.title}`}
            </span>
          </div>
        </div>

        {/* Middle: position + quote */}
        {positionTitle && (
          <span
            style={{
              fontFamily: 'Gotham Bold',
              fontSize: '30px',
              color: '#333',
              marginTop: '15px',
            }}
          >
            {positionTitle}
          </span>
        )}
        {truncatedQuote && (
          <div
            style={{
              display: 'flex',
              padding: '25px 35px',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              borderLeft: '4px solid #f21e40',
              marginTop: '10px',
            }}
          >
            <span
              style={{
                fontFamily: 'Gotham Book',
                fontSize: '32px',
                fontStyle: 'italic',
                color: '#333',
                lineHeight: 1.5,
              }}
            >
              {`\u00AB\u00A0${truncatedQuote}\u00A0\u00BB`}
            </span>
          </div>
        )}

        {/* Bottom: source + date + logo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: '20px',
          }}
        >
          <span style={{ fontFamily: 'Gotham Book', fontSize: '28px', color: '#999' }}>
            {[sourceName, statementDate ? formatDate(statementDate) : null]
              .filter(Boolean)
              .join(' \u2014 ')}
          </span>
          <img src={logoSrc} alt="" height={80} />
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Gotham Bold', data: gothamBold, style: 'normal', weight: 700 },
        { name: 'Gotham Book', data: gothamBook, style: 'normal', weight: 400 },
      ],
    },
  )
}
