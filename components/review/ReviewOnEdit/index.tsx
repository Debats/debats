'use client'

import { useId } from 'react'
import {
  confirmersLine,
  FLAG_REASON_LABELS,
  ReviewDetail,
} from '../../../domain/read-models/review'
import { plural } from '../../../lib/plural'
import TextArea from '../../ui/TextArea'
import { ReviewChoice } from './review-choice'
import styles from './ReviewOnEdit.module.css'

interface ReviewOnEditProps {
  /** Ce que les lecteur·rices ont dit de l'entité qu'on modifie */
  review: ReviewDetail
  choice: ReviewChoice
  onChange: (choice: ReviewChoice) => void
}

/**
 * Ce que la personne qui modifie une entité dit de sa relecture : si sa
 * modification répond aux signalements ouverts, et si elle change ce que des
 * lecteur·rices avaient confirmé. Rien n'est choisi à sa place. À rendre
 * dans le formulaire, pour que le navigateur exige le second choix.
 */
export default function ReviewOnEdit({ review, choice, onChange }: ReviewOnEditProps) {
  const fieldId = useId()
  const { flags, confirmations, confirmers } = review
  const several = flags.length > 1

  return (
    <div className={styles.block}>
      {flags.length > 0 && (
        <div className={styles.flags}>
          <p className={styles.flagsTitle}>
            {several ? 'Des signalements sont en cours' : 'Un signalement est en cours'}
          </p>
          {flags.map((flag) => (
            <div key={flag.id}>
              <p className={styles.reason}>{FLAG_REASON_LABELS[flag.reason]}</p>
              <p className={styles.comment}>« {flag.comment} »</p>
              <p className={styles.meta}>{flag.by ?? 'Un·e lecteur·rice'}</p>
            </div>
          ))}
          <label className={styles.settles}>
            <input
              type="checkbox"
              className={styles.box}
              checked={choice.settlesFlags}
              onChange={(e) => onChange({ ...choice, settlesFlags: e.target.checked })}
            />
            {several
              ? 'Ma modification répond à ces signalements : les clore à l’enregistrement'
              : 'Ma modification répond à ce signalement : le clore à l’enregistrement'}
          </label>
          {choice.settlesFlags && (
            <TextArea
              label="Votre réponse (facultative)"
              id={`${fieldId}-answer`}
              rows={2}
              value={choice.answer}
              onChange={(e) => onChange({ ...choice, answer: e.target.value })}
            />
          )}
        </div>
      )}

      {confirmations > 0 && (
        <fieldset className={styles.confirmations}>
          <legend className={styles.legend}>
            {confirmations === 1
              ? 'La confirmation déjà donnée'
              : `Les ${confirmations} confirmations déjà données`}
          </legend>
          <p className={styles.note}>
            {confirmersLine(confirmers, confirmations)}{' '}
            {plural(confirmations, 'a confirmé', 'ont confirmé')} la version actuelle. Votre
            modification change-t-elle ce qui a été vérifié ?
          </p>
          <div className={styles.choices}>
            <label className={styles.choice}>
              <input
                type="radio"
                name={`${fieldId}-confirmations`}
                required
                className={styles.radio}
                checked={choice.resetConfirmations === false}
                onChange={() => onChange({ ...choice, resetConfirmations: false })}
              />
              {confirmations === 1 ? 'La garder' : 'Les garder'}
            </label>
            <label className={styles.choice}>
              <input
                type="radio"
                name={`${fieldId}-confirmations`}
                required
                className={styles.radio}
                checked={choice.resetConfirmations === true}
                onChange={() => onChange({ ...choice, resetConfirmations: true })}
              />
              {confirmations === 1 ? 'La remettre à zéro' : 'Les remettre à zéro'}
            </label>
          </div>
        </fieldset>
      )}
    </div>
  )
}
