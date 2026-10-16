import FigureAvatar from '../../figures/FigureAvatar'
import OrganisationLogo from '../../organisations/OrganisationLogo'
import { StatementAuthorRef } from '../../../domain/read-models/statement-author'

interface AuthorAvatarProps {
  author: StatementAuthorRef
  size?: number
}

/** Le visuel d'un auteur : avatar rond d'une personnalité, logo carré d'une organisation. */
export default function AuthorAvatar({ author, size = 36 }: AuthorAvatarProps) {
  return author.kind === 'organisation' ? (
    <OrganisationLogo slug={author.slug} name={author.name} acronym={author.acronym} size={size} />
  ) : (
    <FigureAvatar slug={author.slug} name={author.name} size={size} />
  )
}
