'use client'

import { FormEvent, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { publishJointDeclarationAction } from '../../../actions/joint-declarations'
import { FieldErrors } from '../../../../domain/use-cases/types'
import Button from '../../../../components/ui/Button'
import FormError from '../../../../components/ui/FormError'
import TextField from '../../../../components/ui/TextField'
import { JOINT_DECLARATIONS_HREF } from '../../../../domain/read-models/hrefs'
import TakenPositionField, {
  EMPTY_TAKEN_POSITION,
  TakenPositionDraft,
} from '../../components/TakenPositionField'
import styles from './NewJointDeclarationForm.module.css'

/** A position being typed, with a key of its own: rows come and go, their place is not their name */
interface TakenRow extends TakenPositionDraft {
  key: number
}

const EMPTY_TEXT = { title: '', presentation: '', sourceName: '', sourceUrl: '', declaredAt: '' }

/**
 * Le formulaire qui référence une déclaration commune : le texte, puis les
 * positions qu'il prend, sujet par sujet. Ses signataires s'ajoutent ensuite,
 * un·e à un·e, depuis sa page.
 */
export default function NewJointDeclarationForm() {
  const router = useRouter()
  const [text, setText] = useState(EMPTY_TEXT)
  const [rows, setRows] = useState<TakenRow[]>([{ ...EMPTY_TAKEN_POSITION, key: 0 }])
  const [nextKey, setNextKey] = useState(1)
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const change = (field: keyof typeof EMPTY_TEXT) => (e: { target: { value: string } }) =>
    setText((current) => ({ ...current, [field]: e.target.value }))

  const changeRow = useCallback(
    (key: number, value: TakenPositionDraft) =>
      setRows((current) => current.map((row) => (row.key === key ? { ...value, key } : row))),
    [],
  )

  const addRow = useCallback(() => {
    setRows((current) => [...current, { ...EMPTY_TAKEN_POSITION, key: nextKey }])
    setNextKey((key) => key + 1)
  }, [nextKey])

  const removeRow = useCallback(
    (key: number) => setRows((current) => current.filter((row) => row.key !== key)),
    [],
  )

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      try {
        const result = await publishJointDeclarationAction({
          ...text,
          positions: rows.map(({ positionId, quote }) => ({ positionId, quote })),
        })
        if (result.success) {
          router.push(result.href)
          return
        }
        setIsPending(false)
        if (result.error) setError(result.error)
        else setFieldErrors(result.fieldErrors)
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [router, rows, text],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          <span className={styles.step}>1</span> Le texte
        </legend>
        <TextField
          label="Titre"
          id="title"
          required
          placeholder="ex : Le Manifeste de Paris"
          value={text.title}
          onChange={change('title')}
          error={fieldErrors?.title}
        />
        <TextField
          label="En une ligne (facultatif)"
          id="presentation"
          placeholder="Son sous-titre, ou ce qu’il demande"
          value={text.presentation}
          onChange={change('presentation')}
        />
        <div className={styles.row}>
          <TextField
            label="Nom de la source"
            id="sourceName"
            required
            placeholder="ex : Le Monde, site du texte"
            value={text.sourceName}
            onChange={change('sourceName')}
            error={fieldErrors?.sourceName}
          />
          <TextField
            label="Date de publication"
            id="declaredAt"
            type="date"
            required
            value={text.declaredAt}
            onChange={change('declaredAt')}
            error={fieldErrors?.declaredAt}
          />
        </div>
        <TextField
          label="Adresse de la source"
          id="sourceUrl"
          required
          placeholder="https://…"
          value={text.sourceUrl}
          onChange={change('sourceUrl')}
          error={fieldErrors?.sourceUrl}
        />
        <p className={styles.hint}>
          La page où le texte se lit, avec la liste de ses signataires quand c’est possible.
        </p>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          <span className={styles.step}>2</span> Ce que le texte défend
        </legend>
        <p className={styles.hint}>
          Une position par sujet que le texte engage, chacune avec les mots qui l’énoncent. Signer
          le texte, c’est prendre chacune d’elles.
        </p>
        {rows.map((row, index) => (
          <TakenPositionField
            key={row.key}
            id={`taken-${row.key}`}
            value={row}
            onChange={(value) => changeRow(row.key, value)}
            onRemove={rows.length > 1 ? () => removeRow(row.key) : undefined}
            /* The command names the positions as a whole: the message goes under the first */
            error={index === 0 ? fieldErrors?.positions : undefined}
          />
        ))}
        <div>
          <Button variant="secondary" size="small" onClick={addRow}>
            Ajouter un sujet
          </Button>
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Création en cours…' : 'Référencer cette déclaration commune'}
        </Button>
        <Button href={JOINT_DECLARATIONS_HREF} variant="link">
          Annuler
        </Button>
      </div>
    </form>
  )
}
