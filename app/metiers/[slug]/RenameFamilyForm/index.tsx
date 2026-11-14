'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import Button from '../../../../components/ui/Button'
import FormError from '../../../../components/ui/FormError'
import TextField from '../../../../components/ui/TextField'
import { occupationFamilyHref } from '../../../../domain/read-models/hrefs'
import { FieldErrors } from '../../../../domain/use-cases/types'
import { renameOccupationFamilyAction } from '../../../actions/rename-occupation-family'
import styles from './RenameFamilyForm.module.css'

interface RenameFamilyFormProps {
  familyId: string
  /** Le nom que la famille porte aujourd'hui */
  name: string
  /** La révision du flux dont la page est issue : un renommage fait entre-temps n'est pas écrasé */
  revision: number
}

/** Encart du rail : les Idéalistes renomment la famille, et sa page suit son nouveau nom. */
export default function RenameFamilyForm({ familyId, name, revision }: RenameFamilyFormProps) {
  const router = useRouter()
  const [value, setValue] = useState(name)
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(undefined)
    setFieldErrors(undefined)
    setIsPending(true)

    try {
      const result = await renameOccupationFamilyAction(familyId, { name: value, revision })
      if (result.success) {
        // The slug follows the name: the page may live at another address now. When only the
        // writing of the name changed the address is the same, so the page is asked again
        // either way: it then shows the new name and carries the new revision.
        router.replace(occupationFamilyHref(result))
        router.refresh()
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      } else {
        setError(result.error)
      }
    } catch (err) {
      Sentry.captureException(err)
      setError('Une erreur inattendue est survenue.')
    }
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className={styles.card}>
      <h2 className={styles.title}>Renommer la famille</h2>
      <p className={styles.intro}>
        L’adresse de cette page suit le nom : l’ancienne adresse ne répondra plus.
      </p>
      {error && <FormError message={error} />}
      <div className={styles.field}>
        <TextField
          label="Nom"
          id="family-new-name"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={fieldErrors?.name}
        />
      </div>
      <Button type="submit" disabled={isPending || value.trim() === name}>
        {isPending ? 'Renommage…' : 'Renommer'}
      </Button>
    </form>
  )
}
