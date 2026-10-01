import { DraftAuthor } from '../../../../domain/entities/draft-statement'
import { ORGANISATION_TYPE_LABELS } from '../../../../domain/entities/organisation'
import CreationPreview from '../CreationPreview'
import styles from './AuthorCreationPreview.module.css'

interface AuthorCreationPreviewProps {
  author: DraftAuthor
}

/** Shows what would be created for the author of a draft, figure or organisation. */
export default function AuthorCreationPreview({ author }: AuthorCreationPreviewProps) {
  if (!author.data) return null

  const { data } = author

  return (
    <CreationPreview title={author.name}>
      {author.kind === 'organisation' && (
        <p>
          <strong>Type :</strong> {ORGANISATION_TYPE_LABELS[author.data.organisationType]}
          {author.data.acronym && ` — ${author.data.acronym}`}
        </p>
      )}
      <p>{data.presentation}</p>
      {data.wikipediaUrl && (
        <p>
          <strong>Wikipedia :</strong>{' '}
          <a href={data.wikipediaUrl} target="_blank" rel="noopener noreferrer">
            {data.wikipediaUrl}
          </a>
        </p>
      )}
      {data.notorietySources && data.notorietySources.length > 0 && (
        <>
          <p>
            <strong>Sources de notoriété :</strong>
          </p>
          <ul className={styles.notorietySources}>
            {data.notorietySources.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </CreationPreview>
  )
}
