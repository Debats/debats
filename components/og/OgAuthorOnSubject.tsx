import { OG_COLORS, OG_FONTS, truncate } from '../../lib/og'
import OgAvatar from './OgAvatar'

interface OgAuthorOnSubjectProps {
  authorName: string
  subjectTitle: string
  /** Avatar ou logo en data URI, s'il existe */
  avatarSrc: string | null
  shape: 'round' | 'square'
  /** La position et la citation mises en avant, s'il y en a */
  positionTitle: string | null
  quote: string | null
}

/** Contenu de l'image OpenGraph « un auteur sur un sujet » : identité, position, citation. */
export default function OgAuthorOnSubject({
  authorName,
  subjectTitle,
  avatarSrc,
  shape,
  positionTitle,
  quote,
}: OgAuthorOnSubjectProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        {avatarSrc && <OgAvatar src={avatarSrc} size={120} shape={shape} />}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: OG_FONTS.serif,
              fontSize: '56px',
              lineHeight: 1.05,
              color: OG_COLORS.ink,
            }}
          >
            {authorName}
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
            {`sur ${subjectTitle}`}
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
      {quote && (
        <span
          style={{
            fontFamily: OG_FONTS.serif,
            fontSize: '34px',
            lineHeight: 1.35,
            color: OG_COLORS.ink,
            marginTop: '12px',
          }}
        >
          {truncate(quote, 170)}
        </span>
      )}
    </>
  )
}
