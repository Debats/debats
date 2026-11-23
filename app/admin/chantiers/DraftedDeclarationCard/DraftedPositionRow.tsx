import { DraftedPosition } from '../../../../domain/read-models/joint-declaration-draft'
import CreationPreview from '../../drafts/CreationPreview'
import EntityStatus from '../../drafts/EntityStatus'
import styles from './DraftedDeclarationCard.module.css'

interface DraftedPositionRowProps {
  position: DraftedPosition
}

/** Une position que le texte prend : la phrase qui l'énonce, le sujet et la position, connus du site ou à créer */
export default function DraftedPositionRow({ position }: DraftedPositionRowProps) {
  return (
    <li className={styles.position}>
      {position.quote && <blockquote className={styles.quote}>{position.quote}</blockquote>}
      <div className={styles.named}>
        <EntityStatus
          label={position.subjectTitle}
          resolution={position.subject}
          linkPrefix="/s/"
        />
        <EntityStatus label={position.positionTitle} resolution={position.position} />
      </div>
      {position.subjectData && !position.subject.found && (
        <CreationPreview title={position.subjectTitle}>
          <p>{position.subjectData.presentation}</p>
          <p>
            <strong>Problématique :</strong> {position.subjectData.problem}
          </p>
        </CreationPreview>
      )}
      {position.positionData && !position.position.found && (
        <CreationPreview title={position.positionTitle}>
          <p>{position.positionData.description}</p>
        </CreationPreview>
      )}
    </li>
  )
}
