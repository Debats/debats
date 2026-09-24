import { OG_COLORS } from '../../lib/og'

interface OgAvatarProps {
  src: string
  size: number
  /** Décalage négatif à gauche pour empiler les avatars */
  overlap?: boolean
}

/** Avatar rond pour les images OpenGraph : l'arrondi doit être porté par l'image elle-même. */
export default function OgAvatar({ src, size, overlap }: OgAvatarProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- le moteur OpenGraph ne connaît pas next/image
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        marginLeft: overlap ? '-14px' : 0,
        border: `3px solid ${OG_COLORS.paper}`,
      }}
    />
  )
}
