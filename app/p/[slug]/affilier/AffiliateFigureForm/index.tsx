'use client'

import { useState, FormEvent } from 'react'
import * as Sentry from '@sentry/nextjs'
import { addOrganisationMembershipAction } from '../../../../actions/add-organisation-membership'
import {
  searchOrganisations,
  OrganisationSearchResult,
} from '../../../../actions/search-organisations'
import { FieldErrors } from '../../../../../domain/use-cases/types'
import Combobox from '../../../../../components/ui/Combobox'
import TextField from '../../../../../components/ui/TextField'
import Button from '../../../../../components/ui/Button'
import FormError from '../../../../../components/ui/FormError'
import FormSuccess from '../../../../../components/ui/FormSuccess'
import formStyles from '../../../../../components/ui/form-with-guide.module.css'
import styles from './AffiliateFigureForm.module.css'

interface AffiliateFigureFormProps {
  figureId: string
  figureSlug: string
  figureName: string
}

const organisationLabel = (organisation: OrganisationSearchResult) =>
  organisation.acronym ? `${organisation.name} (${organisation.acronym})` : organisation.name

/** Relie la personnalité à une organisation existante, avec un rôle et une période facultatifs. */
export default function AffiliateFigureForm({
  figureId,
  figureSlug,
  figureName,
}: AffiliateFigureFormProps) {
  const [formKey, setFormKey] = useState(0)
  const [candidates, setCandidates] = useState<OrganisationSearchResult[]>([])
  const [organisationId, setOrganisationId] = useState<string>()
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)
  const [added, setAdded] = useState<OrganisationSearchResult>()

  const search = async (query: string) => {
    const results = await searchOrganisations(query)
    setCandidates(results)
    return results.map((o) => ({ id: o.id, label: organisationLabel(o) }))
  }

  const reset = () => {
    setFormKey((key) => key + 1)
    setOrganisationId(undefined)
    setError(undefined)
    setFieldErrors(undefined)
    setAdded(undefined)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const organisation = candidates.find((o) => o.id === organisationId)
    if (!organisation) {
      setFieldErrors({ organisationId: 'Choisissez une organisation dans la liste.' })
      return
    }
    setError(undefined)
    setFieldErrors(undefined)
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    formData.set('publicFigureId', figureId)

    try {
      const result = await addOrganisationMembershipAction(
        organisation.id,
        organisation.slug,
        formData,
      )
      setIsPending(false)
      if (result.success) {
        setAdded(organisation)
      } else {
        setError(result.error)
        setFieldErrors(result.fieldErrors)
      }
    } catch (err) {
      Sentry.captureException(err)
      setError('Une erreur inattendue est survenue. Veuillez réessayer.')
      setIsPending(false)
    }
  }

  if (added) {
    return (
      <FormSuccess
        title={`${figureName} est maintenant affilié·e à ${added.name}.`}
        primaryAction={{ label: `Voir ${figureName}`, href: `/p/${figureSlug}` }}
        secondaryActions={[{ label: 'Affilier à une autre organisation', onClick: reset }]}
      />
    )
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className={formStyles.form}>
      {error && <FormError message={error} />}

      <div className={formStyles.fieldGroup}>
        <Combobox
          label="Organisation"
          id="organisationId"
          name="organisationId"
          required
          placeholder="Rechercher une organisation…"
          onSearch={search}
          onSelect={(id) => setOrganisationId(id)}
        />
        {fieldErrors?.organisationId && (
          <span className={formStyles.fieldError}>{fieldErrors.organisationId}</span>
        )}
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            L&apos;organisation doit déjà exister sur Débats.co. Si ce n&apos;est pas le cas,
            ajoutez-la d&apos;abord depuis la page des organisations.
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
          {isPending ? 'Enregistrement...' : 'Affilier à cette organisation'}
        </Button>
        <Button href={`/p/${figureSlug}`} variant="link">
          Annuler
        </Button>
      </div>
    </form>
  )
}
