'use client'

import { useState, useCallback, FormEvent, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { FieldErrors } from '../../../domain/use-cases/types'
import { ArgumentRef } from '../../../domain/read-models/argument'
import TextField from '../../ui/TextField'

const Combobox = lazy(() => import('../../ui/Combobox'))
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import ArgumentsPicker from '../ArgumentsPicker'
import StatementContentFields from '../StatementContentFields'
import {
  EMPTY_CONTENT_INPUT,
  StatementContentInput,
} from '../../../domain/use-cases/validate-statement-fields'
import styles from './StatementForm.module.css'

interface PositionOption {
  id: string
  title: string
}

type SubmitResult =
  | { success: true }
  | { success: false; error?: string; fieldErrors?: FieldErrors }

interface StatementFormProps {
  onSubmit: (formData: FormData) => Promise<SubmitResult>
  submitLabel: string
  pendingLabel: string
  redirectTo: string
  cancelHref?: string
  positions: PositionOption[]
  onSearchFigures?: (query: string) => Promise<{ id: string; label: string }[]>
  /** Le contributeur a le rang pour mobiliser des arguments */
  canUseArguments?: boolean
  initialArguments?: ArgumentRef[]
  initialPositionId?: string
  /** Ce que la prise de position porte déjà, selon sa nature */
  initialContent?: Partial<StatementContentInput>
  initialSourceName?: string
  initialSourceUrl?: string
  initialStatedAt?: string
}

export default function StatementForm({
  onSubmit,
  submitLabel,
  pendingLabel,
  redirectTo,
  cancelHref,
  positions,
  onSearchFigures,
  canUseArguments = false,
  initialArguments,
  initialPositionId = '',
  initialContent,
  initialSourceName = '',
  initialSourceUrl = '',
  initialStatedAt = '',
}: StatementFormProps) {
  const router = useRouter()
  const [content, setContent] = useState<StatementContentInput>({
    ...EMPTY_CONTENT_INPUT,
    ...initialContent,
  })
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      try {
        const formData = new FormData(e.currentTarget)
        const result = await onSubmit(formData)

        setIsPending(false)

        if (!result.success) {
          if (result.error) setError(result.error)
          if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        } else {
          router.push(redirectTo)
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [onSubmit, redirectTo, router],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      {onSearchFigures && (
        <Suspense>
          <Combobox
            label="Personnalité"
            id="publicFigureId"
            name="publicFigureId"
            required
            placeholder="Rechercher une personnalité..."
            onSearch={onSearchFigures}
          />
        </Suspense>
      )}

      <div className={styles.selectField}>
        <label className={styles.selectLabel} htmlFor="positionId">
          Position
        </label>
        <select
          className={styles.select}
          id="positionId"
          name="positionId"
          required
          defaultValue={initialPositionId}
        >
          <option value="">Sélectionner une position</option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.title}
            </option>
          ))}
        </select>
      </div>

      <StatementContentFields value={content} onChange={setContent} errors={fieldErrors} />

      <TextField
        label="Nom de la source"
        id="sourceName"
        name="sourceName"
        required
        placeholder="ex : Le Monde, France Inter"
        defaultValue={initialSourceName}
        error={fieldErrors?.sourceName}
      />

      <TextField
        label="Lien vers la source"
        id="sourceUrl"
        name="sourceUrl"
        required
        placeholder="https://..."
        defaultValue={initialSourceUrl}
        error={fieldErrors?.sourceUrl}
      />

      <div className={styles.dateField}>
        <label className={styles.dateLabel} htmlFor="statedAt">
          Date de la déclaration
        </label>
        <input
          className={styles.dateInput}
          id="statedAt"
          name="statedAt"
          type="date"
          required
          defaultValue={initialStatedAt}
        />
        {fieldErrors?.statedAt && <span className={styles.fieldError}>{fieldErrors.statedAt}</span>}
      </div>

      {canUseArguments && (
        <div className={styles.selectField}>
          <span className={styles.selectLabel}>Arguments mobilisés</span>
          <ArgumentsPicker initialSelected={initialArguments} error={fieldErrors?.arguments} />
        </div>
      )}

      <div className={styles.actions}>
        <Button type="submit">{isPending ? pendingLabel : submitLabel}</Button>
        {cancelHref && (
          <Button href={cancelHref} variant="link">
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}
