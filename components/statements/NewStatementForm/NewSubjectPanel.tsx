import { FieldErrors } from '../../../domain/use-cases/create-statement'
import { AdviceByField } from '../../ui/FieldAdvice'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Panel from './Panel'
import styles from './NewStatementForm.module.css'

/** The fields of a subject created in place */
export interface SubjectDraft {
  title: string
  presentation: string
  problem: string
}

export const EMPTY_SUBJECT: SubjectDraft = { title: '', presentation: '', problem: '' }

interface NewSubjectPanelProps {
  subject: SubjectDraft
  onChange: (subject: SubjectDraft) => void
  onCancel: () => void
  errors?: FieldErrors
  advice?: AdviceByField
}

/**
 * A subject created without leaving the form.
 *
 * Nothing is written here: the panel holds the fields the submission will
 * carry, in the same transaction as the first position and the statement.
 *
 * The fields bear the names under which the command reports their faults —
 * `subjectTitle` rather than `title`, because the position created beside
 * this subject has a title too.
 *
 * The naming rules are the site's own, and the hints say them where they are
 * being broken rather than on a page nobody reads: a subject is a theme and
 * not a stance, and the question goes in the problématique, never in the
 * title.
 *
 * Title, presentation, then problématique — the order /s/ajouter asks them
 * in, so a contributor who has filled one form is not asked to relearn the
 * other. The published page reads them in another order, the question sitting
 * right under the title, and that is its own business.
 */
export default function NewSubjectPanel({
  subject,
  onChange,
  onCancel,
  errors,
  advice,
}: NewSubjectPanelProps) {
  const withField = (field: keyof SubjectDraft, value: string) =>
    onChange({ ...subject, [field]: value })

  return (
    <Panel title="Nouveau sujet" instead="choisir un sujet existant" onCancel={onCancel}>
      <TextField
        label="Titre du sujet"
        id="subjectTitle"
        required
        placeholder="ex : La fin de vie"
        value={subject.title}
        onChange={(e) => withField('title', e.target.value)}
        error={errors?.subjectTitle}
        advice={advice?.subjectTitle}
      />

      <TextArea
        label="Présentation"
        id="subjectPresentation"
        required
        rows={3}
        placeholder="De quoi il s’agit, en quelques mots factuels."
        value={subject.presentation}
        onChange={(e) => withField('presentation', e.target.value)}
        error={errors?.subjectPresentation}
        advice={advice?.subjectPresentation}
      />

      <TextArea
        label="Problématique"
        id="subjectProblem"
        required
        rows={2}
        placeholder="La question posée, ex : Faut-il légaliser l’aide active à mourir ?"
        value={subject.problem}
        onChange={(e) => withField('problem', e.target.value)}
        error={errors?.subjectProblem}
        advice={advice?.subjectProblem}
      />

      <p className={styles.hint}>
        Le titre nomme le thème, pas un avis : « Le montant du SMIC », jamais « L’augmentation du
        SMIC ». La question va dans la problématique. Un sujet = un débat : si vous hésitez entre
        deux, faites-en deux.
      </p>
    </Panel>
  )
}
