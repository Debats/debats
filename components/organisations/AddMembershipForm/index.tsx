'use client'

import { useState, useCallback, FormEvent } from 'react'
import * as Sentry from '@sentry/nextjs'
import { addOrganisationMembershipAction } from '../../../app/actions/add-organisation-membership'
import { searchPublicFigures } from '../../../app/actions/search-public-figures'
import { FieldErrors } from '../../../domain/use-cases/types'
import Combobox from '../../ui/Combobox'
import TextField from '../../ui/TextField'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import FormSuccess from '../../ui/FormSuccess'
import formStyles from '../../ui/form-with-guide.module.css'
import styles from './AddMembershipForm.module.css'

interface AddMembershipFormProps {
  organisationId: string
  organisationSlug: string
  organisationName: string
}

/** Relie une personnalité existante à une organisation, avec un rôle et une période facultatifs. */
export default function AddMembershipForm({
  organisationId,
  organisationSlug,
  organisationName,
}: AddMembershipFormProps) {
  const [formKey, setFormKey] = useState(0)
  const [figureName, setFigureName] = useState('')
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)
  const [addedName, setAddedName] = useState<string>()

  const searchFigures = useCallback(async (query: string) => {
    const figures = await searchPublicFigures(query)
    return figures.map((figure) => ({ id: figure.id, label: figure.name }))
  }, [])

  const reset = useCallback(() => {
    setFormKey((key) => key + 1)
    setFigureName('')
    setError(undefined)
    setFieldErrors(undefined)
    setAddedName(undefined)
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      try {
        const result = await addOrganisationMembershipAction(
          organisationId,
          organisationSlug,
          new FormData(e.currentTarget),
        )
        setIsPending(false)
        if (result.success) {
          setAddedName(figureName)
        } else {
          setError(result.error)
          setFieldErrors(result.fieldErrors)
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [organisationId, organisationSlug, figureName],
  )

  if (addedName) {
    return (
      <FormSuccess
        title={`${addedName} est maintenant affilié·e à ${organisationName}.`}
        primaryAction={{ label: `Voir ${organisationName}`, href: `/o/${organisationSlug}` }}
        secondaryActions={[{ label: 'Affilier une autre personnalité', onClick: reset }]}
      />
    )
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className={formStyles.form}>
      {error && <FormError message={error} />}

      <div className={formStyles.fieldGroup}>
        <Combobox
          label="Personnalité"
          id="publicFigureId"
          name="publicFigureId"
          required
          placeholder="Rechercher une personnalité…"
          onSearch={searchFigures}
          onSelect={(_, label) => setFigureName(label)}
        />
        {fieldErrors?.publicFigureId && (
          <span className={formStyles.fieldError}>{fieldErrors.publicFigureId}</span>
        )}
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            La personnalité doit déjà exister sur Débats.co. Si ce n&apos;est pas le cas, ajoutez-la
            d&apos;abord depuis la page des personnalités.
          </p>
        </div>
      </div>

      <div className={formStyles.fieldGroup}>
        <TextField
          label="Rôle (optionnel)"
          id="role"
          name="role"
          placeholder="ex : Porte-parole, Secrétaire générale, Député·e…"
          error={fieldErrors?.role}
        />
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            La fonction telle que l&apos;organisation la nomme. Laissez vide pour une simple
            appartenance.
          </p>
        </div>
      </div>

      <div className={styles.dates}>
        <TextField
          label="Depuis le (optionnel)"
          id="startedOn"
          name="startedOn"
          type="date"
          error={fieldErrors?.startedOn}
        />
        <TextField
          label="Jusqu'au (optionnel)"
          id="endedOn"
          name="endedOn"
          type="date"
          error={fieldErrors?.endedOn}
        />
      </div>
      <div className={formStyles.guide}>
        <p className={formStyles.guideTitle}>Conseil</p>
        <p className={formStyles.guideText}>
          Sans date de fin, l&apos;affiliation est considérée comme actuelle. Pour une ancienne
          affiliation, renseignez la date de fin.
        </p>
      </div>

      <div className={formStyles.actions}>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Affilier cette personnalité'}
        </Button>
        <Button href={`/o/${organisationSlug}`} variant="link">
          Annuler
        </Button>
      </div>
    </form>
  )
}
