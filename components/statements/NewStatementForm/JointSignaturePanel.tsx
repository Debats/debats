import { NEW_JOINT_DECLARATION_HREF } from '../../../domain/read-models/hrefs'
import { canPerform } from '../../../domain/reputation/permissions'
import { formatDate } from '../../../lib/format-date'
import Combobox from '../../ui/Combobox'
import LockedAction from './LockedAction'
import UnreadableSignature from './UnreadableSignature'
import { JointSignature } from './useJointSignature'
import styles from './NewStatementForm.module.css'

interface JointSignaturePanelProps {
  joint: JointSignature
  /** Who signs, as the form names them so far; empty until chosen or typed */
  signatoryName: string
  /** The contributor's reputation: referencing a text that is missing takes a rank */
  reputation: number
  error?: string
}

/**
 * What the form asks once the statement is a signature: which text. The
 * subject, the position, the words, the source and the date are the text's —
 * the panel only says what the signature will make.
 */
export default function JointSignaturePanel({
  joint,
  signatoryName,
  reputation,
  error,
}: JointSignaturePanelProps) {
  const { preview } = joint

  return (
    <fieldset className={styles.section}>
      <legend className={styles.sectionTitle}>
        <span className={styles.step}>2</span> Quelle déclaration commune ?
      </legend>
      <Combobox
        label="Déclaration commune"
        id="jointDeclarationId"
        name="jointDeclarationId"
        required
        placeholder="Tapez le titre d’une tribune, d’un manifeste, d’un appel…"
        onSearch={joint.search}
        onSelect={(id, label) => joint.choose(id ? { id, label } : undefined)}
        initialItem={joint.chosen}
      />
      {error && <span className={styles.fieldError}>{error}</span>}
      {canPerform(reputation, 'add_joint_declaration') ? (
        <p className={styles.hint}>
          Elle n’existe pas encore ?{' '}
          {/* In a tab of its own: what is typed here is not thrown away to go and reference the text */}
          <a
            href={NEW_JOINT_DECLARATION_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.hintLink}
          >
            Créer une déclaration commune
          </a>{' '}
          (nouvel onglet), puis revenez la chercher ici.
        </p>
      ) : (
        <LockedAction
          what="Référencer une déclaration commune"
          action="add_joint_declaration"
          reputation={reputation}
        />
      )}

      {joint.chosen && !preview && !joint.unreadable && (
        <p className={styles.hint}>Lecture du texte…</p>
      )}

      {joint.unreadable && (
        <UnreadableSignature reason={joint.unreadable} onReadAgain={joint.readAgain} />
      )}

      {preview && (
        <div className={styles.recap}>
          <p className={styles.recapLead}>
            {signatoryName || 'Le ou la signataire'} rejoindra les signataires. Sa signature vaut
            prise de position sur chaque sujet du texte :
          </p>
          <ul className={styles.recapList}>
            {preview.stances.map((stance) => (
              <li key={stance.subjectHref} className={styles.recapItem}>
                <span className={styles.recapSubject}>{stance.subjectTitle}</span>
                <span className={styles.recapPosition}>{stance.positionTitle}</span>
              </li>
            ))}
          </ul>
          <p className={styles.recapMeta}>
            {formatDate(new Date(preview.declaredAt))} · {preview.sourceName}
          </p>
        </div>
      )}
    </fieldset>
  )
}
