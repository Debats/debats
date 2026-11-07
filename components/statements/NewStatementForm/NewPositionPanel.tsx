import { FieldErrors } from '../../../domain/use-cases/create-statement'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Panel from './Panel'
import styles from './NewStatementForm.module.css'

/** Les champs d'une position ouverte en place */
export interface PositionDraft {
  title: string
  description: string
}

interface NewPositionPanelProps {
  position: PositionDraft
  onChange: (position: PositionDraft) => void
  onCancel: () => void
  errors?: FieldErrors
}

/**
 * Une position ouverte sans quitter le formulaire.
 *
 * Rien n'est écrit ici : le panneau tient deux champs que l'envoi portera
 * avec le reste, dans la même transaction que la prise de position.
 *
 * Les champs portent les noms sous lesquels la commande rapporte leurs fautes
 * — `positionTitle` plutôt que `title`, parce qu'un sujet ouvert dans ce même
 * formulaire aura un titre lui aussi.
 */
export default function NewPositionPanel({
  position,
  onChange,
  onCancel,
  errors,
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
      />

      <p className={styles.hint}>
        Une position décrit le débat, elle ne le tranche pas : nommez l’avis défendu, pas la
        personne qui le défend.
      </p>
    </Panel>
  )
}
