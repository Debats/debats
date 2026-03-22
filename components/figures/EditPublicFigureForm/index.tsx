'use client'

import { useState, useCallback, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { updatePublicFigureAction, ActionResult } from '../../../app/actions/update-public-figure'
import { FieldErrors } from '../../../domain/use-cases/update-public-figure'
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
}

export default function EditPublicFigureForm({
  figureId,
  figureSlug,
  initialName,
  initialPresentation,
  initialWikipediaUrl,
  initialWebsiteUrl,
  initialNotorietySources,
}: EditPublicFigureFormProps) {
  const router = useRouter()

  const [name, setName] = useState(initialName)
  const [presentation, setPresentation] = useState(initialPresentation)
  const [wikipediaUrl, setWikipediaUrl] = useState(initialWikipediaUrl)
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl)
  const [notorietySource1, setNotorietySource1] = useState(initialNotorietySources[0] ?? '')
  const [notorietySource2, setNotorietySource2] = useState(initialNotorietySources[1] ?? '')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>()

  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const photoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoPreviewUrl(URL.createObjectURL(file))
    } else {
      setPhotoPreviewUrl(undefined)
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
    [figureId, name, presentation, wikipediaUrl, websiteUrl, notorietySource1, notorietySource2, router],
  )

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
            name="photo"
            type="file"
            accept="image/jpeg,image/png"
            ref={photoInputRef}
            onChange={handlePhotoChange}
          />
          {fieldErrors?.photo && <span className={formStyles.fieldError}>{fieldErrors.photo}</span>}
        </div>
        {photoPreviewUrl && (
          <img src={photoPreviewUrl} alt="Aperçu" className={localStyles.photoPreview} />
        )}
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
      </div>

      {showNotorietySources && (
        <div className={localStyles.notorietySection}>
          <p className={localStyles.notorietyTitle}>Sources de notoriété</p>
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
