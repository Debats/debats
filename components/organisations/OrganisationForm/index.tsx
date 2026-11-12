'use client'

import { useState, useCallback, FormEvent, ReactNode } from 'react'
import Image from 'next/image'
import * as Sentry from '@sentry/nextjs'
import { ORGANISATION_TYPES, ORGANISATION_TYPE_LABELS } from '../../../domain/entities/organisation'
import { FieldErrors } from '../../../domain/use-cases/types'
import { OrganisationFormInput } from '../../../lib/forms/organisation-form'
import { useChosenFile } from '../../../lib/forms/use-chosen-file'
import NotorietySources, { notorietySourcePair } from '../../forms/NotorietySources'
import WikipediaFill from '../../forms/WikipediaFill'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Select from '../../ui/Select'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import GuideExample from '../../ui/GuideExample'
import OrganisationLogo from '../OrganisationLogo'
import formStyles from '../../ui/form-with-guide.module.css'
import styles from './OrganisationForm.module.css'

export interface OrganisationFormValues {
  name: string
  acronym: string
  organisationType: string
  presentation: string
  wikipediaUrl: string
  websiteUrl: string
  notorietySources: readonly string[]
}

/**
 * The fields this state holds, and only those: the notoriety sources and the
 * logo are kept apart, each by what edits it. A field in the state that nothing
 * updates would be sent back as it was read.
 */
type TextFields = Omit<OrganisationFormValues, 'notorietySources'>

const emptyOrganisationValues: OrganisationFormValues = {
  name: '',
  acronym: '',
  organisationType: '',
  presentation: '',
  wikipediaUrl: '',
  websiteUrl: '',
  notorietySources: [],
}

export type SubmitOutcome =
  | { success: true }
  | { success: false; error?: string; fieldErrors?: FieldErrors }

interface OrganisationFormProps {
  initialValues?: OrganisationFormValues
  /** Slug de l'organisation modifiée, pour afficher le logo actuel */
  currentSlug?: string
  submitLabel: string
  pendingLabel: string
  cancelHref?: string
  /** Envoie le formulaire ; le résultat pilote l'affichage des erreurs */
  onSubmit: (values: OrganisationFormInput) => Promise<SubmitOutcome>
  /** Ce que l'appelant ajoute au formulaire, juste avant ses boutons (la relecture, à la modification) */
  children?: ReactNode
}

const TYPE_OPTIONS = [
  { value: '', label: 'Choisir un type…' },
  ...ORGANISATION_TYPES.map((type) => ({ value: type, label: ORGANISATION_TYPE_LABELS[type] })),
]

/** Champs communs à la création et à la modification d'une organisation. */
export default function OrganisationForm({
  initialValues = emptyOrganisationValues,
  currentSlug,
  submitLabel,
  pendingLabel,
  cancelHref,
  onSubmit,
  children,
}: OrganisationFormProps) {
  const [fields, setFields] = useState<TextFields>(() => ({
    name: initialValues.name,
    acronym: initialValues.acronym,
    organisationType: initialValues.organisationType,
    presentation: initialValues.presentation,
    wikipediaUrl: initialValues.wikipediaUrl,
    websiteUrl: initialValues.websiteUrl,
  }))
  const [notorietySources, setNotorietySources] = useState(() =>
    notorietySourcePair(initialValues.notorietySources),
  )
  const { file: logo, previewUrl: logoPreviewUrl, choose: chooseLogo } = useChosenFile()
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const setValue = (field: keyof TextFields) => (value: string) =>
    setFields((current) => ({ ...current, [field]: value }))

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      try {
        const outcome = await onSubmit({ ...fields, notorietySources, logo })
        if (!outcome.success) {
          setError(outcome.error)
          setFieldErrors(outcome.fieldErrors)
          setIsPending(false)
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [fields, notorietySources, logo, onSubmit],
  )

  const showNotorietySources = !fields.wikipediaUrl.trim()

  return (
    <form onSubmit={handleSubmit} className={formStyles.form}>
      {error && <FormError message={error} />}

      <div className={formStyles.fieldGroup}>
        <TextField
          label="Nom"
          id="name"
          required
          placeholder="ex : Confédération générale du travail"
          value={fields.name}
          onChange={(e) => setValue('name')(e.target.value)}
          error={fieldErrors?.name}
        />
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            Le nom officiel complet, sans forme juridique ni article superflu.
          </p>
          <GuideExample good="Greenpeace France" bad="L'association Greenpeace France" />
        </div>
      </div>

      <div className={styles.row}>
        <TextField
          label="Sigle (optionnel)"
          id="acronym"
          placeholder="ex : CGT"
          value={fields.acronym}
          onChange={(e) => setValue('acronym')(e.target.value)}
          error={fieldErrors?.acronym}
        />
        <Select
          label="Type"
          id="organisationType"
          required
          options={TYPE_OPTIONS}
          value={fields.organisationType}
          onChange={(e) => setValue('organisationType')(e.target.value)}
          error={fieldErrors?.organisationType}
        />
      </div>

      <div className={formStyles.fieldGroup}>
        <TextArea
          label="Présentation"
          id="presentation"
          required
          placeholder="Courte présentation de l'organisation (min. 10 caractères)"
          rows={4}
          value={fields.presentation}
          onChange={(e) => setValue('presentation')(e.target.value)}
          error={fieldErrors?.presentation}
        />
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            Ce qu&apos;elle est, ce qu&apos;elle fait, depuis quand. Restez factuel et neutre, sans
            jugement de valeur.
          </p>
        </div>
      </div>

      <div className={formStyles.fieldGroup}>
        <div className={styles.fileField}>
          <label className={formStyles.label} htmlFor="logo">
            Logo (optionnel{currentSlug ? ', laisser vide pour conserver l’actuel' : ''})
          </label>
          <div className={styles.logoRow}>
            {currentSlug && !logoPreviewUrl && (
              <OrganisationLogo
                slug={currentSlug}
                name={fields.name}
                acronym={fields.acronym}
                size={72}
              />
            )}
            {logoPreviewUrl && (
              <Image
                src={logoPreviewUrl}
                alt=""
                width={72}
                height={72}
                unoptimized
                className={styles.logoPreview}
              />
            )}
            <input
              className={styles.fileInput}
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => chooseLogo(e.target.files?.[0])}
            />
          </div>
          {fieldErrors?.logo && <span className={formStyles.fieldError}>{fieldErrors.logo}</span>}
        </div>
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            Un logo net, si possible sur fond transparent (PNG). Il sera redimensionné
            automatiquement. Sans logo, le sigle est affiché à sa place.
          </p>
        </div>
      </div>

      <div className={formStyles.fieldGroup}>
        <TextField
          label="URL Wikipedia (optionnel)"
          id="wikipediaUrl"
          placeholder="https://fr.wikipedia.org/wiki/..."
          value={fields.wikipediaUrl}
          onChange={(e) => setValue('wikipediaUrl')(e.target.value)}
          error={fieldErrors?.wikipediaUrl}
        />
        <WikipediaFill
          url={fields.wikipediaUrl}
          onFilled={({ name, presentation }) =>
            setFields((current) => ({ ...current, name, presentation }))
          }
        />
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            La page Wikipedia de l&apos;organisation, si elle en a une. Seules les pages
            fr.wikipedia.org et en.wikipedia.org sont acceptées.
          </p>
        </div>
      </div>

      {showNotorietySources && (
        <NotorietySources
          who="l’organisation"
          sources={notorietySources}
          onChange={setNotorietySources}
          error={fieldErrors?.notorietySources}
        />
      )}

      <div className={formStyles.fieldGroup}>
        <TextField
          label="Site web (optionnel)"
          id="websiteUrl"
          type="url"
          placeholder="https://..."
          value={fields.websiteUrl}
          onChange={(e) => setValue('websiteUrl')(e.target.value)}
        />
      </div>

      {children}

      <div className={formStyles.actions}>
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        {cancelHref && (
          <Button href={cancelHref} variant="link">
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}
