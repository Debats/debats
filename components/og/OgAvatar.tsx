import { OG_COLORS } from '../../lib/og'

interface OgAvatarProps {
  src: string
  size: number
  /** Décalage négatif à gauche pour empiler les avatars */
  overlap?: boolean
  /** Carré arrondi pour le logo d'une organisation, rond pour une personnalité */
  shape?: 'round' | 'square'
}

/** Avatar pour les images OpenGraph : l'arrondi doit être porté par l'image elle-même. */
export default function OgAvatar({ src, size, overlap, shape = 'round' }: OgAvatarProps) {
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
        borderRadius: shape === 'square' ? `${Math.round(size / 6)}px` : '50%',
        objectFit: shape === 'square' ? 'contain' : 'cover',
        // Le moteur de rendu lit chaque propriété présente : pas de valeur `undefined`
        ...(shape === 'square' ? { backgroundColor: OG_COLORS.card } : {}),
        flexShrink: 0,
        marginLeft: overlap ? '-14px' : 0,
        border: `3px solid ${OG_COLORS.paper}`,
      }}
    />
  )
}
