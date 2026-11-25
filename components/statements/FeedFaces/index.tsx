import { FeedEntry, leadOf } from '../../../domain/read-models/feed-entries'
import AuthorAvatar from '../AuthorAvatar'
import AuthorAvatarStack from '../AuthorAvatarStack'

/** Qui une entrée du flux montre : les signataires nommé·es d'un texte, ou son auteur·rice. */
export default function FeedFaces({ entry, size }: { entry: FeedEntry; size: number }) {
  return entry.kind === 'signatures' ? (
    <AuthorAvatarStack authors={entry.named} max={entry.named.length} size={size} />
  ) : (
    <AuthorAvatar author={leadOf(entry).author} size={size} />
  )
}
