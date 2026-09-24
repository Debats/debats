import Link from 'next/link'
import FigureAvatar from '../FigureAvatar'
import styles from './FigureAvatarStack.module.css'

interface Figure {
  id: string
  name: string
  slug: string
}

interface FigureAvatarStackProps {
  figures: Figure[]
  /** Nombre total de personnalités, quand la liste est tronquée en amont */
  totalCount?: number
  /** Nombre maximal d'avatars affichés avant le badge « +N » */
  max?: number
  size?: number
  /** Suffixe ajouté après /p/{slug} (ex. « /s/le-nucleaire ») ; sert aussi de lien au badge « +N » */
  hrefSuffix?: string
  /**
   * À désactiver quand la pile est elle-même dans un lien : HTML interdit
   * d'imbriquer des liens, et le navigateur casserait le balisage.
   */
  linked?: boolean
}

/**
 * Avatars empilés avec un léger chevauchement, sans mesure de largeur :
 * on affiche au plus `max` avatars puis un badge « +N ».
 */
export default function FigureAvatarStack({
  figures,
  totalCount,
  max = 6,
  size = 36,
  hrefSuffix = '',
  linked = true,
}: FigureAvatarStackProps) {
  if (figures.length === 0) return null

  const total = totalCount ?? figures.length
  const visible = total > max ? figures.slice(0, max - 1) : figures.slice(0, max)
  const hidden = total - visible.length
  const badgeClassName = `${styles.item} ${styles.badge}`
  const badgeStyle = { width: size, height: size }

  return (
    <div className={styles.stack}>
      {visible.map((figure) => {
        const avatar = <FigureAvatar slug={figure.slug} name={figure.name} size={size} />
        return linked ? (
          <Link
            key={figure.id}
            href={`/p/${figure.slug}${hrefSuffix}`}
            className={styles.item}
            title={figure.name}
          >
            {avatar}
          </Link>
        ) : (
          <span key={figure.id} className={styles.item} title={figure.name}>
            {avatar}
          </span>
        )
      })}
      {hidden > 0 &&
        (linked && hrefSuffix ? (
          <Link href={hrefSuffix} className={badgeClassName} style={badgeStyle}>
            +{hidden}
          </Link>
        ) : (
          <span className={badgeClassName} style={badgeStyle}>
            +{hidden}
          </span>
        ))}
    </div>
  )
}
