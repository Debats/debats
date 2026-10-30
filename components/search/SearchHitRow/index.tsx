import AuthorAvatar from '../../statements/AuthorAvatar'
import { SEARCH_KIND_LABELS, SearchHit } from '../../../domain/read-models/search'
import styles from './SearchHitRow.module.css'

interface SearchHitRowProps {
  hit: SearchHit
}

/** Un résultat de recherche : son visuel ou son type, son titre, ce qui le distingue. */
export default function SearchHitRow({ hit }: SearchHitRowProps) {
  return (
    <span className={styles.row}>
      {hit.kind === 'public_figure' || hit.kind === 'organisation' ? (
        <AuthorAvatar
          author={{
            kind: hit.kind,
            id: hit.id,
            name: hit.title,
            slug: hit.slug,
            acronym: hit.kind === 'organisation' ? hit.detail : null,
          }}
          size={32}
        />
      ) : (
        <span className={styles.kind}>{SEARCH_KIND_LABELS[hit.kind].singular}</span>
      )}
      <span className={styles.body}>
        <span className={styles.title}>{hit.title}</span>
        {hit.detail && <span className={styles.detail}>{hit.detail}</span>}
      </span>
    </span>
  )
}
