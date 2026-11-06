import { FieldErrors } from '../../../domain/use-cases/create-statement'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import styles from './NewStatementForm.module.css'

interface NewPositionPanelProps {
  title: string
  description: string
  onTitle: (value: string) => void
  onDescription: (value: string) => void
  onCancel: () => void
  errors?: FieldErrors
}

/**
 * Une position ouverte sans quitter le formulaire.
 *
 * Rien n'est écrit ici : le panneau tient deux champs que l'envoi portera
 * avec le reste, dans la même transaction que la prise de position. Annuler
 * referme le panneau et rend la main aux positions existantes.
 *
 * Les champs sont ceux du design system, et portent les noms sous lesquels la
 * commande rapporte leurs fautes — `positionTitle` plutôt que `title`, parce
 * qu'un sujet ouvert dans ce même formulaire aura un titre lui aussi.
 */
export default function NewPositionPanel({
  title,
  description,
  onTitle,
  onDescription,
  onCancel,
  errors,
}: NewPositionPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <p className={styles.panelTitle}>Nouvelle position</p>
        <p className={styles.panelNote}>écrite avec votre prise de position</p>
      </div>

      <TextField
        label="Titre de la position"
        id="positionTitle"
        required
        placeholder="ex : Pour une aide active à mourir encadrée"
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        error={errors?.positionTitle}
      />

      <TextArea
        label="Description de la position"
        id="positionDescription"
        required
        rows={2}
        placeholder="Ce que défend cette position, en une phrase."
        value={description}
        onChange={(e) => onDescription(e.target.value)}
        error={errors?.positionDescription}
      />

      <p className={styles.hint}>
        Une position décrit le débat, elle ne le tranche pas : nommez l’avis défendu, pas la
        personne qui le défend.
      </p>

      <button type="button" className={styles.panelCancel} onClick={onCancel}>
        Annuler et choisir une position existante
      </button>
    </div>
  )
}
