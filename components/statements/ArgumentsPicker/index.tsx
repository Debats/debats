'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArgumentOption,
  getArgumentsForSubject,
} from '../../../app/actions/get-arguments-for-subject'
import { NewArgumentInput } from '../../../domain/use-cases/statement-arguments'
import Button from '../../ui/Button'
import styles from './ArgumentsPicker.module.css'

interface ArgumentsPickerProps {
  /** Le sujet dont on liste les arguments ; sans sujet, rien à cocher */
  subjectId: string
  /** Arguments déjà mobilisés (modification d'une prise de position) */
  initialSelectedIds?: string[]
  /** Message d'erreur du serveur sur ce bloc */
  error?: string
}

/**
 * Étape « Arguments mobilisés » d'une prise de position : cocher les
 * arguments déjà recensés sur le sujet, ou en proposer de nouveaux. Les choix
 * partent avec le formulaire parent via des champs cachés.
 */
export default function ArgumentsPicker({
  subjectId,
  initialSelectedIds = [],
  error,
}: ArgumentsPickerProps) {
  /** Les arguments chargés, et pour quel sujet : un autre sujet repart de zéro */
  const [fetched, setFetched] = useState<{ subjectId: string; options: ArgumentOption[] }>()
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds)
  const [proposals, setProposals] = useState<NewArgumentInput[]>([])
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftError, setDraftError] = useState<string>()

  useEffect(() => {
    if (!subjectId) return

    let cancelled = false
    getArgumentsForSubject(subjectId).then((options) => {
      if (!cancelled) setFetched({ subjectId, options })
    })
    return () => {
      cancelled = true
    }
  }, [subjectId])

  const options = fetched?.subjectId === subjectId ? fetched.options : []
  const loading = !!subjectId && fetched?.subjectId !== subjectId

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    )
  }, [])

  const addProposal = useCallback(() => {
    const title = draftTitle.trim()
    const description = draftDescription.trim()
    if (title.length < 3 || description.length < 10) {
      setDraftError('Un titre d’au moins 3 caractères et une description d’au moins 10.')
      return
    }
    setProposals((current) => [...current, { title, description }])
    setDraftTitle('')
    setDraftDescription('')
    setDraftError(undefined)
  }, [draftTitle, draftDescription])

  const removeProposal = useCallback((index: number) => {
    setProposals((current) => current.filter((_, i) => i !== index))
  }, [])

  return (
    <div className={styles.picker}>
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="argumentIds" value={id} />
      ))}
      <input type="hidden" name="newArguments" value={JSON.stringify(proposals)} />

      {!subjectId ? (
        <p className={styles.hint}>Choisissez d’abord un sujet.</p>
      ) : loading ? (
        <p className={styles.hint}>Chargement des arguments…</p>
      ) : options.length === 0 ? (
        <p className={styles.hint}>Aucun argument n’est encore recensé sur ce sujet.</p>
      ) : (
        <ul className={styles.options}>
          {options.map((option) => {
            const checked = selectedIds.includes(option.id)
            return (
              <li key={option.id}>
                <label className={checked ? `${styles.option} ${styles.optionOn}` : styles.option}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={checked}
                    onChange={() => toggle(option.id)}
                  />
                  <span className={styles.optionBody}>
                    <span className={styles.optionTitle}>{option.title}</span>
                    <span className={styles.optionDescription}>{option.description}</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      {proposals.length > 0 && (
        <ul className={styles.proposals} aria-label="Arguments proposés">
          {proposals.map((proposal, index) => (
            <li key={`${proposal.title}-${index}`} className={styles.proposal}>
              <span className={styles.proposalBody}>
                <span className={styles.optionTitle}>{proposal.title}</span>
                <span className={styles.optionDescription}>{proposal.description}</span>
              </span>
              <button
                type="button"
                className={styles.remove}
                onClick={() => removeProposal(index)}
                aria-label={`Retirer l’argument ${proposal.title}`}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}

      {subjectId && (
        <div className={styles.proposalForm}>
          <p className={styles.proposalLabel}>Un argument manque ? Proposez-le.</p>
          <input
            className={styles.control}
            type="text"
            placeholder="Titre court, ex : Coût pour les finances publiques"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            aria-label="Titre de l’argument"
          />
          <textarea
            className={styles.control}
            rows={2}
            placeholder="En une ou deux phrases, le raisonnement tel qu’il est avancé"
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            aria-label="Description de l’argument"
          />
          {draftError && <p className={styles.error}>{draftError}</p>}
          <div>
            <Button type="button" variant="secondary" size="small" onClick={addProposal}>
              Ajouter cet argument
            </Button>
          </div>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
