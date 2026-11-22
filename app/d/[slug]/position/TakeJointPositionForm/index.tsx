'use client'

import { FormEvent, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { takeJointPositionAction } from '../../../../actions/joint-declarations'
import Button from '../../../../../components/ui/Button'
import FormError from '../../../../../components/ui/FormError'
import TakenPositionField, {
  EMPTY_TAKEN_POSITION,
  TakenPositionDraft,
} from '../../../components/TakenPositionField'
import styles from './TakeJointPositionForm.module.css'

interface TakeJointPositionFormProps {
  declarationId: string
  /** Where to go back to, once the position is recorded or the form given up */
  backHref: string
  /** How many signatories will take the new position */
  signatories: number
}

/** Le formulaire qui dit qu'une déclaration commune prend position sur un sujet de plus. */
export default function TakeJointPositionForm({
  declarationId,
  backHref,
  signatories,
}: TakeJointPositionFormProps) {
  const router = useRouter()
  const [taken, setTaken] = useState<TakenPositionDraft>(EMPTY_TAKEN_POSITION)
  const [error, setError] = useState<string>()
  const [quoteError, setQuoteError] = useState<string>()
  const [positionError, setPositionError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setQuoteError(undefined)
      setPositionError(undefined)
      setIsPending(true)

      try {
        const result = await takeJointPositionAction({
          declarationId,
          positionId: taken.positionId,
          quote: taken.quote,
        })
        if (result.success) {
          router.push(result.href)
          return
        }
        setIsPending(false)
        const faults = result.fieldErrors ?? {}
        setQuoteError(faults.quote)
        setPositionError(faults.positionId)
        setError(result.error)
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [declarationId, router, taken],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}
      <TakenPositionField
        id="taken"
        value={taken}
        onChange={setTaken}
        error={quoteError}
        positionError={positionError}
      />
      {signatories > 0 && (
        <p className={styles.hint}>
          {signatories > 1
            ? `Les ${signatories} signataires du texte prendront cette position.`
            : 'Le ou la signataire du texte prendra cette position.'}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Ajouter cette position au texte'}
        </Button>
        <Button href={backHref} variant="link">
          Annuler
        </Button>
      </div>
    </form>
  )
}
