import Link from 'next/link'
import AuthorAvatar from '../AuthorAvatar'
import {
  authorHref,
  authorOnSubjectHref,
  StatementAuthorRef,
} from '../../../domain/read-models/statement-author'
import styles from './AuthorAvatarStack.module.css'

interface AuthorAvatarStackProps {
  authors: StatementAuthorRef[]
  /** Nombre total d'auteurs, quand la liste est tronquée en amont */
  totalCount?: number
  /** Nombre maximal de visuels affichés avant le badge « +N » */
  max?: number
  size?: number
  /** Relie chaque auteur à sa page sur ce sujet plutôt qu'à sa page générale */
  subjectSlug?: string
  /** Lien du badge « +N » */
  moreHref?: string
  /**
   * À désactiver quand la pile est elle-même dans un lien : HTML interdit
   * d'imbriquer des liens, et le navigateur casserait le balisage.
   */
  linked?: boolean
}

/**
 * Avatars et logos empilés avec un léger chevauchement, sans mesure de largeur :
 * on affiche au plus `max` auteurs puis un badge « +N ».
 */
export default function AuthorAvatarStack({
  authors,
  totalCount,
  max = 6,
  size = 36,
  subjectSlug,
  moreHref,
  linked = true,
}: AuthorAvatarStackProps) {
  if (authors.length === 0) return null

  const total = totalCount ?? authors.length
  const visible = total > max ? authors.slice(0, max - 1) : authors.slice(0, max)
  const hidden = total - visible.length
  const badgeClassName = `${styles.item} ${styles.badge}`
  const badgeStyle = { width: size, height: size }
  const hrefOf = (author: StatementAuthorRef) =>
    subjectSlug ? authorOnSubjectHref(author, subjectSlug) : authorHref(author)

  return (
    <div className={styles.stack}>
      {visible.map((author) => {
        const itemClassName =
          author.kind === 'organisation' ? `${styles.item} ${styles.square}` : styles.item
        const avatar = <AuthorAvatar author={author} size={size} />
        return linked ? (
          <Link
            key={`${author.kind}-${author.id}`}
            href={hrefOf(author)}
            className={itemClassName}
            title={author.name}
          >
            {avatar}
          </Link>
        ) : (
          <span key={`${author.kind}-${author.id}`} className={itemClassName} title={author.name}>
            {avatar}
          </span>
        )
      })}
      {hidden > 0 &&
        (linked && moreHref ? (
          <Link href={moreHref} className={badgeClassName} style={badgeStyle}>
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
