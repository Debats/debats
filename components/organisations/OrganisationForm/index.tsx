'use client'

import { useState, useCallback, useRef, FormEvent } from 'react'
import Image from 'next/image'
import * as Sentry from '@sentry/nextjs'
import { ORGANISATION_TYPES, ORGANISATION_TYPE_LABELS } from '../../../domain/entities/organisation'
import { FieldErrors } from '../../../domain/use-cases/types'
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
  onSubmit: (formData: FormData) => Promise<SubmitOutcome>
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
}: OrganisationFormProps) {
  const [values, setValues] = useState(initialValues)
  const [notorietySource1, setNotorietySource1] = useState(initialValues.notorietySources[0] ?? '')
  const [notorietySource2, setNotorietySource2] = useState(initialValues.notorietySources[1] ?? '')
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>()
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const setValue = (field: keyof OrganisationFormValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }))

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setLogoPreviewUrl(file ? URL.createObjectURL(file) : undefined)
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      const formData = new FormData()
      formData.set('name', values.name)
      formData.set('acronym', values.acronym)
      formData.set('organisationType', values.organisationType)
      formData.set('presentation', values.presentation)
      formData.set('wikipediaUrl', values.wikipediaUrl)
      formData.set('websiteUrl', values.websiteUrl)
      for (const source of [notorietySource1, notorietySource2]) {
        if (source.trim()) formData.append('notorietySources', source.trim())
      }
      const logo = logoInputRef.current?.files?.[0]
      if (logo) formData.set('logo', logo)

      try {
        const outcome = await onSubmit(formData)
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
    [values, notorietySource1, notorietySource2, onSubmit],
  )

  const showNotorietySources = !values.wikipediaUrl.trim()

  return (
    <form onSubmit={handleSubmit} className={formStyles.form}>
      {error && <FormError message={error} />}

      <div className={formStyles.fieldGroup}>
        <TextField
          label="Nom"
          id="name"
          name="name"
          required
          placeholder="ex : Confédération générale du travail"
          value={values.name}
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
          name="acronym"
          placeholder="ex : CGT"
          value={values.acronym}
          onChange={(e) => setValue('acronym')(e.target.value)}
          error={fieldErrors?.acronym}
        />
        <Select
          label="Type"
          id="organisationType"
          name="organisationType"
          required
          options={TYPE_OPTIONS}
          value={values.organisationType}
          onChange={(e) => setValue('organisationType')(e.target.value)}
          error={fieldErrors?.organisationType}
        />
      </div>

      <div className={formStyles.fieldGroup}>
        <TextArea
          label="Présentation"
          id="presentation"
          name="presentation"
          required
          placeholder="Courte présentation de l'organisation (min. 10 caractères)"
          rows={4}
          value={values.presentation}
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
                name={values.name}
                acronym={values.acronym}
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
              name="logo"
              type="file"
              accept="image/png,image/jpeg"
              ref={logoInputRef}
              onChange={handleLogoChange}
            />
          </div>
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
          name="wikipediaUrl"
          placeholder="https://fr.wikipedia.org/wiki/..."
          value={values.wikipediaUrl}
          onChange={(e) => setValue('wikipediaUrl')(e.target.value)}
          error={fieldErrors?.wikipediaUrl}
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
        <div className={styles.notoriety}>
          <p className={styles.notorietyTitle}>Sources de notoriété</p>
          <div className={formStyles.guide}>
            <p className={formStyles.guideTitle}>Pourquoi ?</p>
            <p className={formStyles.guideText}>
              Sans page Wikipedia, l&apos;organisation doit justifier de sa notoriété par au moins
              deux publications dans des sources indépendantes et fiables (article de presse, page
              institutionnelle, rapport officiel...).
            </p>
          </div>
          <TextField
            label="Source de notoriété 1"
            id="notorietySource1"
            name="notorietySources"
            type="url"
            required
            placeholder="https://lemonde.fr/..."
            value={notorietySource1}
            onChange={(e) => setNotorietySource1(e.target.value)}
          />
          <TextField
            label="Source de notoriété 2"
            id="notorietySource2"
            name="notorietySources"
            type="url"
            required
            placeholder="https://liberation.fr/..."
            value={notorietySource2}
            onChange={(e) => setNotorietySource2(e.target.value)}
          />
          {fieldErrors?.notorietySources && (
            <span className={formStyles.fieldError}>{fieldErrors.notorietySources}</span>
          )}
        </div>
      )}

      <div className={formStyles.fieldGroup}>
        <TextField
          label="Site web (optionnel)"
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          placeholder="https://..."
          value={values.websiteUrl}
          onChange={(e) => setValue('websiteUrl')(e.target.value)}
        />
      </div>

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
