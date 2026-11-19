import { StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { OG_COLORS } from '../../../lib/og'
import { authorKey } from '../../../domain/services/author-on-subject'
import { SlideFaces } from '../../../lib/carousel-image'

interface CarouselFaceProps {
  author: StatementAuthorRef
  faces: SlideFaces
  size: number
  /** Pulled over the face before it, in a pile */
  overlap?: number
  /** The ground the face stands on, for the ring that parts it from its neighbour */
  ground?: string
}

/** The letters that stand for an author the storage has no image of */
const initialsOf = (author: StatementAuthorRef): string =>
  author.acronym ??
  author.name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

/**
 * Who took position: the portrait of a public figure, round, or the logo of
 * an organisation, square. Without an image, the initials on ink: an author
 * is never left out of a count for want of a picture.
 */
export default function CarouselFace({
  author,
  faces,
  size,
  overlap = 0,
  ground,
}: CarouselFaceProps) {
  const src = faces[authorKey(author)] ?? null
  const square = author.kind === 'organisation'
  const shape = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: square ? `${Math.round(size / 6)}px` : '50%',
    flexShrink: 0,
    marginLeft: `${-overlap}px`,
    border: `${ground ? Math.max(3, Math.round(size / 24)) : 0}px solid ${ground ?? OG_COLORS.paper}`,
  }

  if (src === null) {
    return (
      <div
        style={{
          ...shape,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ground === OG_COLORS.ink ? OG_COLORS.ink2 : OG_COLORS.ink,
          color: OG_COLORS.paper,
          fontSize: `${Math.round(size / 3.2)}px`,
          fontWeight: 600,
        }}
      >
        {initialsOf(author)}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- le moteur OpenGraph ne connaît pas next/image
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{
        ...shape,
        objectFit: square ? 'contain' : 'cover',
        backgroundColor: OG_COLORS.card,
      }}
    />
  )
}
