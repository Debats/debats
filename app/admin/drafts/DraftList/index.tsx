import { DraftStatement } from '../../../../domain/entities/draft-statement'
import { DraftResolution } from '../../../../domain/use-cases/resolve-draft'
import { authorDraftsHref, DraftsView } from '../../../../domain/read-models/drafts-view'
import DraftCard from '../DraftCard'
import styles from './DraftList.module.css'

type DraftWithResolution = {
  draft: DraftStatement
  resolution: DraftResolution
}

interface DraftListProps {
  drafts: DraftWithResolution[]
  /** The view the list is seen from, so a card only offers the authors it does not show */
  view: DraftsView
}

export default function DraftList({ drafts, view }: DraftListProps) {
  return (
    <div className={styles.list}>
      {drafts.map(({ draft, resolution }) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          resolution={resolution}
          authorDraftsHref={authorDraftsHref(view, draft.author)}
        />
      ))}
    </div>
  )
}
