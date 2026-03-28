import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'

export const alt = 'Personnalité'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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

  // Collect unique subjects
  const subjectsMap = new Map<string, string>()
  for (const s of statements) {
    if (!subjectsMap.has(s.subject.id)) {
      subjectsMap.set(s.subject.id, s.subject.title)
    }
  }
  const subjectTitles = Array.from(subjectsMap.values())

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

  const presentation = figure.presentation ?? ''
  const truncatedPresentation =
    presentation.length > 120 ? presentation.slice(0, 117) + '\u2026' : presentation

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
          justifyContent: 'flex-start',
          padding: '30px 35px 25px 35px',
          flex: 1,
        }}
      >
        {/* Top: avatar + name + presentation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          {avatarSrc && (
            <div
              style={{
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
              }}
            >
              <img src={avatarSrc} alt="" width={200} height={200} style={{ objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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
            {truncatedPresentation && (
              <span
                style={{
                  fontFamily: 'Gotham Book',
                  fontSize: '28px',
                  color: '#666',
                  marginTop: '10px',
                  lineHeight: 1.4,
                }}
              >
                {truncatedPresentation}
              </span>
            )}
          </div>
        </div>

        {/* Middle: subjects */}
        {subjectTitles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontFamily: 'Gotham Bold',
                  fontSize: '22px',
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {`${statements.length} prise${statements.length > 1 ? 's' : ''} de position sur ${subjectTitles.length} sujet${subjectTitles.length > 1 ? 's' : ''}`}
              </span>
              <img src={logoSrc} alt="" height={60} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {subjectTitles.slice(0, 6).map((title) => (
                <span
                  key={title}
                  style={{
                    fontFamily: 'Gotham Book',
                    fontSize: '22px',
                    color: '#333',
                    backgroundColor: '#f5f5f5',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '1px solid #ddd',
                  }}
                >
                  {title}
                </span>
              ))}
              {subjectTitles.length > 6 && (
                <span
                  style={{
                    fontFamily: 'Gotham Book',
                    fontSize: '22px',
                    color: '#999',
                    padding: '8px 16px',
                  }}
                >
                  {`+${subjectTitles.length - 6}`}
                </span>
              )}
            </div>
          </div>
        )}
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
