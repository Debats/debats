'use client'

import { useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createStatementAction, ActionResult } from '../../../app/actions/create-statement'
import { searchPublicFigures } from '../../../app/actions/search-public-figures'
import { FieldErrors } from '../../../domain/use-cases/create-statement'
import Combobox from '../../ui/Combobox'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import styles from './AddStatementForm.module.css'

interface PositionOption {
  id: string
  title: string
}

interface AddStatementFormProps {
  subjectId: string
  slug: string
  positions: PositionOption[]
}

export default function AddStatementForm({ subjectId, slug, positions }: AddStatementFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      const formData = new FormData(e.currentTarget)
      const result: ActionResult = await createStatementAction(subjectId, slug, formData)

      setIsPending(false)

      if (!result.success) {
        setError(result.error)
        setFieldErrors(result.fieldErrors)
      } else {
        router.push(`/s/${slug}`)
      }
    },
    [subjectId, slug, router],
  )

  const handleSearchFigures = useCallback(async (query: string) => {
    const results = await searchPublicFigures(query)
    return results.map((f) => ({ id: f.id, label: f.name }))
  }, [])

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <Combobox
        label="Personnalité"
        id="publicFigureId"
        name="publicFigureId"
        required
        placeholder="Rechercher une personnalité..."
        onSearch={handleSearchFigures}
      />

      <div className={styles.selectField}>
        <label className={styles.selectLabel} htmlFor="positionId">
          Position
        </label>
        <select className={styles.select} id="positionId" name="positionId" required>
          <option value="">Sélectionner une position</option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.title}
            </option>
          ))}
        </select>
      </div>

      <TextField
        label="Nom de la source"
        id="sourceName"
        name="sourceName"
        required
        placeholder="ex : Le Monde, France Inter"
        error={fieldErrors?.sourceName}
      />

      <TextField
        label="URL de la source"
        id="sourceUrl"
        name="sourceUrl"
        placeholder="https://..."
      />

      <TextArea
        label="Citation"
        id="quote"
        name="quote"
        required
        placeholder="Citation exacte de la personnalité (min. 10 caractères)"
        rows={4}
        error={fieldErrors?.quote}
      />

      <div className={styles.dateField}>
        <label className={styles.dateLabel} htmlFor="statedAt">
          Date de la déclaration
        </label>
        <input className={styles.dateInput} id="statedAt" name="statedAt" type="date" required />
        {fieldErrors?.statedAt && <span className={styles.fieldError}>{fieldErrors.statedAt}</span>}
      </div>

      <div className={styles.actions}>
        <Button type="submit">
          {isPending ? 'Ajout en cours...' : 'Ajouter cette prise de position'}
        </Button>
      </div>
    </form>
  )
}
