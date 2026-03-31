import { DraftStatement } from '../../../../domain/entities/draft-statement'
import { DraftResolution } from '../../../../domain/use-cases/resolve-draft'
import DraftCard from '../DraftCard'
import styles from './DraftList.module.css'

type DraftWithResolution = {
  draft: DraftStatement
  resolution: DraftResolution
}

interface DraftListProps {
  drafts: DraftWithResolution[]
}

export default function DraftList({ drafts }: DraftListProps) {
  return (
    <div className={styles.list}>
      {drafts.map(({ draft, resolution }) => (
        <DraftCard key={draft.id} draft={draft} resolution={resolution} />
      ))}
    </div>
  )
}
