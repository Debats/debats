import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../../infra/supabase/ssr'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'

export const alt = 'Sujet de débat'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabase = await createSSRSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)
  const statementRepo = createStatementRepository(supabase)

  const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))

  if (!subject) {
    return new ImageResponse(<div>Sujet introuvable</div>, { ...size })
  }

  const statements = await Effect.runPromise(statementRepo.findBySubjectWithFigures(subject.id))

  // Unique figures
  const figuresMap = new Map<string, { name: string; slug: string }>()
  for (const s of statements) {
    if (!figuresMap.has(s.publicFigure.id)) {
      figuresMap.set(s.publicFigure.id, { name: s.publicFigure.name, slug: s.publicFigure.slug })
    }
  }
  const figures = Array.from(figuresMap.values())

  // Unique positions
  const positionIds = new Set(statements.map((s) => s.position.id))

  const [gothamBold, gothamBook, logoBuffer] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/Gotham-Bold.woff')),
    readFile(join(process.cwd(), 'public/fonts/Gotham-Book.woff')),
    readFile(join(process.cwd(), 'public/images/logo.png')),
  ])
  const logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`

  // Load avatars for first 8 figures
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:64321'
  const avatarEntries = await Promise.all(
    figures.slice(0, 8).map(async (f) => {
      try {
        const res = await fetch(`${supabaseUrl}/storage/v1/object/public/avatars/${f.slug}.jpg`)
        if (!res.ok) return null
        const buffer = Buffer.from(await res.arrayBuffer())
        return { name: f.name, src: `data:image/jpeg;base64,${buffer.toString('base64')}` }
      } catch {
        return null
      }
    }),
  )
  const avatars = avatarEntries.filter((a): a is { name: string; src: string } => a !== null)

  const presentation = subject.presentation ?? ''
  const truncated = presentation.length > 140 ? presentation.slice(0, 137) + '\u2026' : presentation

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: '#fff',
      }}
    >
      <div style={{ width: '8px', backgroundColor: '#f21e40', flexShrink: 0 }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '35px 40px 30px 40px',
          flex: 1,
        }}
      >
        {/* Title + presentation */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: 'Gotham Bold',
              fontSize: '56px',
              color: '#f21e40',
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}
          >
            {subject.title}
          </span>
          {truncated && (
            <span
              style={{
                fontFamily: 'Gotham Book',
                fontSize: '28px',
                color: '#666',
                marginTop: '12px',
                lineHeight: 1.4,
              }}
            >
              {truncated}
            </span>
          )}
        </div>

        {/* Stats + avatars */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '25px' }}>
          <span
            style={{
              fontFamily: 'Gotham Bold',
              fontSize: '22px',
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '15px',
            }}
          >
            {`${positionIds.size} position${positionIds.size > 1 ? 's' : ''} \u00B7 ${figures.length} personnalit\u00E9${figures.length > 1 ? 's' : ''}`}
          </span>
          {avatars.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {avatars.map((a) => (
                <div
                  key={a.name}
                  style={{
                    width: '65px',
                    height: '65px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                  }}
                >
                  <img src={a.src} alt="" width={65} height={65} style={{ objectFit: 'cover' }} />
                </div>
              ))}
              {figures.length > 8 && (
                <span
                  style={{
                    fontFamily: 'Gotham Book',
                    fontSize: '24px',
                    color: '#999',
                    marginLeft: '8px',
                  }}
                >
                  {`+${figures.length - 8}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
          <img src={logoSrc} alt="" height={70} />
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
