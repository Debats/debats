'use client'

import { useState, useCallback, useRef, FormEvent } from 'react'
import * as Sentry from '@sentry/nextjs'
import { createPublicFigureAction, ActionResult } from '../../../app/actions/create-public-figure'
import { FieldErrors } from '../../../domain/use-cases/create-public-figure'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import FormSuccess from '../../ui/FormSuccess'
import GuideExample from '../../ui/GuideExample'
import formStyles from '../../ui/form-with-guide.module.css'
import localStyles from './NewPublicFigureForm.module.css'

export default function NewPublicFigureForm() {
  const [name, setName] = useState('')
  const [presentation, setPresentation] = useState('')
  const [wikipediaUrl, setWikipediaUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [notorietySource1, setNotorietySource1] = useState('')
  const [notorietySource2, setNotorietySource2] = useState('')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>()

  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)
  const [successResult, setSuccessResult] = useState<{
    slug: string
    name: string
    id: string
  }>()

  const photoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPhotoPreviewUrl(url)
    } else {
      setPhotoPreviewUrl(undefined)
    }
  }, [])

  const resetForm = useCallback(() => {
    setName('')
    setPresentation('')
    setWikipediaUrl('')
    setWebsiteUrl('')
    setNotorietySource1('')
    setNotorietySource2('')
    setPhotoPreviewUrl(undefined)
    setError(undefined)
    setFieldErrors(undefined)
    setSuccessResult(undefined)
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }, [])

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      const formData = new FormData()
      formData.set('name', name)
      formData.set('presentation', presentation)
      formData.set('wikipediaUrl', wikipediaUrl)
      formData.set('websiteUrl', websiteUrl)

      const s1 = notorietySource1.trim()
      const s2 = notorietySource2.trim()
      if (s1) formData.append('notorietySources', s1)
      if (s2) formData.append('notorietySources', s2)

      const photoFile = photoInputRef.current?.files?.[0]
      if (photoFile) {
        formData.set('photo', photoFile)
      }

      try {
        const result: ActionResult = await createPublicFigureAction(formData)

        setIsPending(false)

        if (!result.success) {
          if (result.error) {
            setError(result.error)
          }
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors)
          }
        } else {
          setSuccessResult({
            slug: result.slug,
            name: result.name,
            id: result.id,
          })
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [name, presentation, wikipediaUrl, websiteUrl, notorietySource1, notorietySource2],
  )

  if (successResult) {
    return (
      <FormSuccess
        title={`${successResult.name} a été ajouté·e !`}
        primaryAction={{
          label: `Ajouter une prise de position pour ${successResult.name}`,
          href: `/nouvelle-prise-de-position?figureId=${successResult.id}&figureName=${encodeURIComponent(successResult.name)}`,
        }}
        secondaryActions={[
          {
            label: `Voir la page de ${successResult.name}`,
            href: `/p/${successResult.slug}`,
          },
          {
            label: 'Ajouter une autre personnalité',
            onClick: resetForm,
          },
        ]}
      />
    )
  }

  const showNotorietySources = !wikipediaUrl.trim()

  return (
    <form onSubmit={handleSubmit} className={formStyles.form}>
      {error && <FormError message={error} />}

      <div className={formStyles.fieldGroup}>
        <TextField
          label="Nom"
          id="name"
          name="name"
          required
          placeholder="ex : Albert Camus, Simone Veil..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors?.name}
        />
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            Le nom complet tel qu&apos;il est communément connu. Pas de titre (Dr, M., Mme).
          </p>
          <GuideExample good="Simone Veil" bad="Mme Simone Veil" />
        </div>
      </div>

      <div className={formStyles.fieldGroup}>
        <TextArea
          label="Présentation"
          id="presentation"
          name="presentation"
          required
          placeholder="Courte présentation de la personnalité (min. 10 caractères)"
          rows={4}
          value={presentation}
          onChange={(e) => setPresentation(e.target.value)}
          error={fieldErrors?.presentation}
        />
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            Décrivez brièvement qui est cette personne : fonction, rôle, domaine d&apos;activité.
            Restez factuel et neutre, sans jugement de valeur.
          </p>
        </div>
      </div>

      <div className={formStyles.fieldGroup}>
        <div className={localStyles.fileField}>
          <label className={localStyles.fileLabel} htmlFor="photo">
            Photo
          </label>
          <input
            className={localStyles.fileInput}
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png"
            required
            ref={photoInputRef}
            onChange={handlePhotoChange}
          />
          {fieldErrors?.photo && <span className={formStyles.fieldError}>{fieldErrors.photo}</span>}
        </div>
        {photoPreviewUrl && (
          <img src={photoPreviewUrl} alt="Aperçu" className={localStyles.photoPreview} />
        )}
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            Une photo portrait de bonne qualité. Elle sera redimensionnée automatiquement. Formats
            acceptés : JPEG, PNG.
          </p>
        </div>
      </div>

      <div className={formStyles.fieldGroup}>
        <TextField
          label="URL Wikipedia (optionnel)"
          id="wikipediaUrl"
          name="wikipediaUrl"
          placeholder="https://fr.wikipedia.org/wiki/..."
          value={wikipediaUrl}
          onChange={(e) => setWikipediaUrl(e.target.value)}
          error={fieldErrors?.wikipediaUrl}
        />
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            La page Wikipedia de la personnalité, si elle en a une. Seules les pages
            fr.wikipedia.org et en.wikipedia.org sont acceptées.
          </p>
        </div>
      </div>

      {showNotorietySources && (
        <div className={localStyles.notorietySection}>
          <p className={localStyles.notorietyTitle}>Sources de notoriété</p>
          <div className={formStyles.guide}>
            <p className={formStyles.guideTitle}>Pourquoi ?</p>
            <p className={formStyles.guideText}>
              Sans page Wikipedia, la personnalité doit justifier de sa notoriété par au moins deux
              publications dans des sources indépendantes et fiables (article de presse, page
              institutionnelle, rapport officiel...).
            </p>
          </div>
          <TextField
            label="Source de notoriété 1"
            id="notorietySource1"
            name="notorietySources"
            required
            placeholder="https://lemonde.fr/..."
            value={notorietySource1}
            onChange={(e) => setNotorietySource1(e.target.value)}
          />
          <TextField
            label="Source de notoriété 2"
            id="notorietySource2"
            name="notorietySources"
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
          placeholder="https://..."
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            Le site officiel de la personnalité, s&apos;il existe.
          </p>
        </div>
      </div>

      <div className={formStyles.actions}>
        <Button type="submit">
          {isPending ? 'Création en cours...' : 'Ajouter cette personnalité'}
        </Button>
      </div>
    </form>
  )
}
