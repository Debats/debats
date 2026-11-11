'use client'

import { useState, useCallback, FormEvent } from 'react'
import Image from 'next/image'
import * as Sentry from '@sentry/nextjs'
import { createPublicFigureAction, ActionResult } from '../../../app/actions/create-public-figure'
import { figureHref } from '../../../domain/read-models/hrefs'
import { FieldErrors } from '../../../domain/use-cases/create-public-figure'
import { newPublicFigureForm } from '../../../lib/forms/public-figure-form'
import { useChosenFile } from '../../../lib/forms/use-chosen-file'
import NotorietySources, { notorietySourcePair } from '../../forms/NotorietySources'
import WikipediaFill from '../../forms/WikipediaFill'
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
  const [notorietySources, setNotorietySources] = useState(() => notorietySourcePair([]))
  const { file: photo, previewUrl: photoPreviewUrl, choose: choosePhoto } = useChosenFile()
  // Bumped to remount the file input: a chosen file cannot be cleared from React state alone
  const [photoInputKey, setPhotoInputKey] = useState(0)

  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)
  const [successResult, setSuccessResult] = useState<{
    slug: string
    name: string
    id: string
  }>()

  const resetForm = useCallback(() => {
    setName('')
    setPresentation('')
    setWikipediaUrl('')
    setWebsiteUrl('')
    setNotorietySources(notorietySourcePair([]))
    choosePhoto(undefined)
    setPhotoInputKey((key) => key + 1)
    setError(undefined)
    setFieldErrors(undefined)
    setSuccessResult(undefined)
  }, [choosePhoto])

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      const formData = newPublicFigureForm.encode({
        name,
        presentation,
        wikipediaUrl,
        websiteUrl,
        notorietySources,
        photo,
      })

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
    [name, presentation, wikipediaUrl, websiteUrl, notorietySources, photo],
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
            href: figureHref(successResult.slug),
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
            key={photoInputKey}
            className={localStyles.fileInput}
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(e) => choosePhoto(e.target.files?.[0])}
          />
          {fieldErrors?.photo && <span className={formStyles.fieldError}>{fieldErrors.photo}</span>}
        </div>
        {photoPreviewUrl && (
          <Image
            src={photoPreviewUrl}
            alt=""
            width={200}
            height={200}
            unoptimized
            className={localStyles.photoPreview}
          />
        )}
        <div className={formStyles.guide}>
          <p className={formStyles.guideTitle}>Conseil</p>
          <p className={formStyles.guideText}>
            Une photo portrait de bonne qualité. Elle sera redimensionnée automatiquement. Formats
            acceptés : JPEG, PNG, WebP.
          </p>
        </div>
      </div>

      <div className={formStyles.fieldGroup}>
        <TextField
          label="URL Wikipedia (optionnel)"
          id="wikipediaUrl"
          placeholder="https://fr.wikipedia.org/wiki/..."
          value={wikipediaUrl}
          onChange={(e) => setWikipediaUrl(e.target.value)}
          error={fieldErrors?.wikipediaUrl}
        />
        <WikipediaFill
          url={wikipediaUrl}
          onFilled={(facts) => {
            setName(facts.name)
            setPresentation(facts.presentation)
          }}
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
        <NotorietySources
          who="la personnalité"
          sources={notorietySources}
          onChange={setNotorietySources}
          error={fieldErrors?.notorietySources}
        />
      )}

      <div className={formStyles.fieldGroup}>
        <TextField
          label="Site web (optionnel)"
          id="websiteUrl"
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
