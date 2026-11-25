import AuthorAvatar from '../../statements/AuthorAvatar'
import { SEARCH_KIND_LABELS, SearchHit } from '../../../domain/read-models/search'
import { StatementAuthorRef } from '../../../domain/read-models/statement-author'
import SearchExcerpt from './SearchExcerpt'
import styles from './SearchHitRow.module.css'

interface SearchHitRowProps {
  hit: SearchHit
  /** Ce qui a été cherché, pour marquer ses mots dans le passage trouvé */
  query: string
}

type Face = Pick<StatementAuthorRef, 'kind' | 'name' | 'slug' | 'acronym'>

/** Who a hit shows the face of: itself, or the author of a statement; nobody for the other kinds */
function faceOf(hit: SearchHit): Face | null {
  const named = { name: hit.title, slug: hit.slug }
  switch (hit.kind) {
    case 'public_figure':
      return { ...named, kind: hit.kind, acronym: null }
    case 'organisation':
      return { ...named, kind: hit.kind, acronym: hit.detail }
    case 'statement':
      // The title and the slug of a statement are its author's
      return { ...named, kind: hit.authorKind, acronym: null }
    default:
      return null
  }
}

/** Un résultat de recherche : son visuel ou son type, son titre, ce qui le distingue, le passage trouvé. */
export default function SearchHitRow({ hit, query }: SearchHitRowProps) {
  const face = faceOf(hit)
  return (
    <span className={styles.row}>
      {face ? (
        <AuthorAvatar author={face} size={32} />
      ) : (
        <span className={styles.kind}>{SEARCH_KIND_LABELS[hit.kind].singular}</span>
      )}
      <span className={styles.body}>
        <span className={styles.title}>{hit.title}</span>
        {hit.detail && <span className={styles.detail}>{hit.detail}</span>}
        {hit.excerpt && <SearchExcerpt excerpt={hit.excerpt} query={query} />}
      </span>
    </span>
  )
}
