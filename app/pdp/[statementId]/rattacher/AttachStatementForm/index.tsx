'use client'

import { FormEvent, useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import {
  attachStatementsAction,
  planAttachment,
} from '../../../../actions/attach-to-joint-declaration'
import {
  JointDeclarationOption,
  searchJointDeclarations,
} from '../../../../actions/joint-declarations'
import {
  AttachmentPlan,
  suggestedAttachments,
} from '../../../../../domain/read-models/attachment-plan'
import { NEW_JOINT_DECLARATION_HREF } from '../../../../../domain/read-models/hrefs'
import { formatDate } from '../../../../../lib/format-date'
import Button from '../../../../../components/ui/Button'
import Combobox from '../../../../../components/ui/Combobox'
import FormError from '../../../../../components/ui/FormError'
import AttachmentRefused from './AttachmentRefused'
import PlannedStanceRow from './PlannedStanceRow'
import styles from './AttachStatementForm.module.css'

interface AttachStatementFormProps {
  /** The statement being attached, as the form reminds it */
  statement: {
    id: string
    authorName: string
    subjectTitle: string
    positionTitle: string
    summary: string
    sourceName: string
  }
  /** Where to go back to when the form is given up */
  backHref: string
}

/** What the form knows of the text chosen: being read, read, or unreadable */
type Reading =
  | { state: 'none' }
  | { state: 'reading' }
  | { state: 'read'; plan: AttachmentPlan }
  | { state: 'missing' }
  | { state: 'failed' }

/**
 * Le formulaire qui dit qu'une prise de position déjà en ligne est la
 * signature d'une déclaration commune : on choisit le texte, le formulaire
 * dit ce que le rattachement fera sur chaque position du texte, puis on
 * confirme. Rien n'est écrit avant.
 */
export default function AttachStatementForm({ statement, backHref }: AttachStatementFormProps) {
  const router = useRouter()
  const [reading, setReading] = useState<Reading>({ state: 'none' })
  /** For each open position of the text, the statement of the author attached to it; empty to make a new one */
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  /** The texts the search last offered: the Combobox hands back an id, the plan is read by slug */
  const offered = useRef(new Map<string, JointDeclarationOption>())
  /** The text whose plan is awaited: an answer for another one is stale */
  const awaited = useRef<string | undefined>(undefined)

  const search = useCallback(async (query: string) => {
    const found = await searchJointDeclarations(query)
    offered.current = new Map(found.map((option) => [option.id, option]))
    return found.map((option) => ({ id: option.id, label: option.title }))
  }, [])

  const read = useCallback(
    (declarationId: string | undefined) => {
      const option = declarationId ? offered.current.get(declarationId) : undefined
      awaited.current = option?.id
      setError(undefined)
      setChosen({})
      if (!option) return setReading({ state: 'none' })
      setReading({ state: 'reading' })
      planAttachment(statement.id, option.slug).then(
        (plan) => {
          if (awaited.current !== option.id) return
          if (!plan) return setReading({ state: 'missing' })
          setChosen(suggestedAttachments(plan))
          setReading({ state: 'read', plan })
        },
        (err) => {
          Sentry.captureException(err, { tags: { feature: 'attach-statement-plan' } })
          if (awaited.current === option.id) setReading({ state: 'failed' })
        },
      )
    },
    [statement.id],
  )

  const plan = reading.state === 'read' ? reading.plan : undefined

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!plan || plan.refusal) return
      setError(undefined)
      setIsPending(true)
      try {
        const result = await attachStatementsAction({
          declarationId: plan.declaration.id,
          statementIds: [statement.id, ...Object.values(chosen).filter(Boolean)],
        })
        if (result.success) return router.push(result.href)
        setError(result.error)
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
      }
      setIsPending(false)
    },
    [chosen, plan, router, statement.id],
  )

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <FormError message={error} />}

      <div className={styles.statement}>
        <p className={styles.statementLead}>
          {statement.authorName}, pour <strong>{statement.positionTitle}</strong> sur{' '}
          {statement.subjectTitle}
        </p>
        <p className={styles.statementSummary}>« {statement.summary} »</p>
        <p className={styles.meta}>{statement.sourceName}</p>
      </div>

      <Combobox
        label="De quelle déclaration commune est-ce la signature ?"
        id="jointDeclarationId"
        name="jointDeclarationId"
        required
        placeholder="Tapez le titre d’une tribune, d’un manifeste, d’un appel…"
        onSearch={search}
        onSelect={(id) => read(id || undefined)}
      />
      <p className={styles.hint}>
        Elle n’existe pas encore ?{' '}
        <a
          href={NEW_JOINT_DECLARATION_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.hintLink}
        >
          Créer une déclaration commune
        </a>{' '}
        (nouvel onglet), puis revenez la chercher ici.
      </p>

      {reading.state === 'reading' && <p className={styles.hint}>Lecture du texte…</p>}
      {reading.state === 'missing' && (
        <p className={styles.alert} role="alert">
          Cette déclaration commune n’est plus sur le site.
        </p>
      )}
      {reading.state === 'failed' && (
        <p className={styles.alert} role="alert">
          Le texte n’a pas pu être lu. Choisissez-le de nouveau pour réessayer.
        </p>
      )}

      {plan?.refusal && <AttachmentRefused refusal={plan.refusal} declaration={plan.declaration} />}

      {plan && !plan.refusal && (
        <fieldset className={styles.plan}>
          <legend className={styles.planLead}>
            {statement.authorName} rejoindra les signataires de « {plan.declaration.title} ».
            Signer, c’est prendre chaque position du texte :
          </legend>
          <ul className={styles.stances}>
            {plan.stances.map((stance) => (
              <PlannedStanceRow
                key={stance.positionId}
                stance={stance}
                attachedId={chosen[stance.positionId] ?? ''}
                onAttach={(statementId) =>
                  setChosen((current) => ({ ...current, [stance.positionId]: statementId }))
                }
              />
            ))}
          </ul>
          <p className={styles.meta}>
            Chaque prise de position rattachée prendra les mots du texte, sa source (
            {plan.declaration.sourceName}) et sa date (
            {formatDate(new Date(plan.declaration.declaredAt))}
            ), et gardera ses arguments. Ce qu’elle disait jusqu’ici est remplacé.
          </p>
        </fieldset>
      )}

      <div className={styles.actions}>
        <Button type="submit" disabled={isPending || !plan || !!plan.refusal}>
          {isPending ? 'Rattachement…' : 'Rattacher à ce texte'}
        </Button>
        <Button href={backHref} variant="link">
          Annuler
        </Button>
      </div>
    </form>
  )
}
