'use client'

import { useState, useCallback, FormEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { updatePublicFigureAction, ActionResult } from '../../../app/actions/update-public-figure'
import { editPublicFigureForm } from '../../../lib/forms/public-figure-form'
import { useChosenFile } from '../../../lib/forms/use-chosen-file'
import { FieldErrors } from '../../../domain/use-cases/update-public-figure'
import NotorietySources, { notorietySourcePair } from '../../forms/NotorietySources'
import TextField from '../../ui/TextField'
import TextArea from '../../ui/TextArea'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import FigureAvatar from '../FigureAvatar'
import formStyles from '../../ui/form-with-guide.module.css'
import localStyles from '../NewPublicFigureForm/NewPublicFigureForm.module.css'

interface EditPublicFigureFormProps {
  figureId: string
  figureSlug: string
  initialName: string
  initialPresentation: string
  initialWikipediaUrl: string
  initialWebsiteUrl: string
  initialNotorietySources: readonly string[]
  /** The revision of the figure's stream the form shows: an edit made meanwhile is not overwritten */
  revision: number
}

export default function EditPublicFigureForm({
  figureId,
  figureSlug,
  initialName,
  initialPresentation,
  initialWikipediaUrl,
  initialWebsiteUrl,
  initialNotorietySources,
  revision,
}: EditPublicFigureFormProps) {
  const router = useRouter()

  const [name, setName] = useState(initialName)
  const [presentation, setPresentation] = useState(initialPresentation)
  const [wikipediaUrl, setWikipediaUrl] = useState(initialWikipediaUrl)
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl)
  const [notorietySources, setNotorietySources] = useState(() =>
    notorietySourcePair(initialNotorietySources),
  )
  const { file: photo, previewUrl: photoPreviewUrl, choose: choosePhoto } = useChosenFile()

  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      const formData = editPublicFigureForm.encode({
        name,
        presentation,
        wikipediaUrl,
        websiteUrl,
        notorietySources,
        photo,
        revision,
      })

      try {
        const result: ActionResult = await updatePublicFigureAction(figureId, formData)

        setIsPending(false)

        if (!result.success) {
          if (result.error) setError(result.error)
          if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        } else {
          router.push(`/p/${result.slug}`)
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [
      figureId,
      name,
      presentation,
      wikipediaUrl,
      websiteUrl,
      notorietySources,
      photo,
      revision,
      router,
    ],
  )

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
      </div>

      <div className={formStyles.fieldGroup}>
        <div className={localStyles.fileField}>
          <label className={localStyles.fileLabel} htmlFor="photo">
            Photo (laisser vide pour conserver l&apos;actuelle)
          </label>
          <FigureAvatar slug={figureSlug} name={name} size={80} />
          <input
            className={localStyles.fileInput}
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
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
      </div>

      <div className={formStyles.actions}>
        <Button type="submit">
          {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
        <Button href={`/p/${figureSlug}`} variant="link">
          Annuler
        </Button>
      </div>
    </form>
  )
}
