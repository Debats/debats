import { FieldErrors } from '../../../domain/use-cases/create-statement'
import { AdviceByField } from '../../ui/FieldAdvice'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Panel from './Panel'
import styles from './NewStatementForm.module.css'

/** The fields of a position created in place */
export interface PositionDraft {
  title: string
  description: string
}

interface NewPositionPanelProps {
  position: PositionDraft
  onChange: (position: PositionDraft) => void
  /** Absent when this position is the first of a subject being created with it */
  onCancel?: () => void
  errors?: FieldErrors
  advice?: AdviceByField
}

/**
 * A position created without leaving the form.
 *
 * Nothing is written here: the panel holds two fields the submission will
 * carry with the rest, in the same transaction as the statement.
 *
 * The fields bear the names under which the command reports their faults —
 * `positionTitle` rather than `title`, because a subject created in this same
 * form will have a title of its own.
 */
export default function NewPositionPanel({
  position,
  onChange,
  onCancel,
  errors,
  advice,
}: NewPositionPanelProps) {
  const withField = (field: keyof PositionDraft, value: string) =>
    onChange({ ...position, [field]: value })

  return (
    <Panel title="Nouvelle position" instead="choisir une position existante" onCancel={onCancel}>
      <TextField
        label="Titre de la position"
        id="positionTitle"
        required
        placeholder="ex : Pour une aide active à mourir encadrée"
        value={position.title}
        onChange={(e) => withField('title', e.target.value)}
        error={errors?.positionTitle}
        advice={advice?.positionTitle}
      />

      <TextArea
        label="Description de la position"
        id="positionDescription"
        required
        rows={2}
        placeholder="Ce que défend cette position, en une phrase."
        value={position.description}
        onChange={(e) => withField('description', e.target.value)}
        error={errors?.positionDescription}
        advice={advice?.positionDescription}
      />

      <p className={styles.hint}>
        Une position décrit le débat, elle ne le tranche pas : nommez l’avis défendu, pas la
        personne qui le défend.
      </p>
    </Panel>
  )
}
