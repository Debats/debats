'use client'

import { useState, useCallback, useEffect, FocusEvent, FormEvent } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { addStatementAction, ActionResult } from '../../../app/actions/add-statement'
import { searchPublicFigures } from '../../../app/actions/search-public-figures'
import { searchOrganisations } from '../../../app/actions/search-organisations'
import { searchSubjects } from '../../../app/actions/search-subjects'
import {
  getPositionsForSubject,
  PositionOption,
} from '../../../app/actions/get-positions-for-subject'
import {
  FieldErrors,
  NewStatement,
  StatementPositionInput,
} from '../../../domain/use-cases/create-statement'
import { StatementAuthorKind } from '../../../domain/entities/statement'
import { canPerform } from '../../../domain/reputation/permissions'
import { readStatementArguments } from '../../../lib/forms/statement-arguments'
import {
  EMPTY_CONTENT_INPUT,
  StatementContentInput,
} from '../../../domain/use-cases/validate-statement-fields'
import Combobox from '../../ui/Combobox'
import ComingSoon from '../../ui/ComingSoon'
import Segmented from '../../ui/Segmented'
import TextField from '../../ui/TextField'
import Button from '../../ui/Button'
import FormError from '../../ui/FormError'
import FormSuccess from '../../ui/FormSuccess'
import { useStatementDraft } from '../StatementDraft'
import ArgumentsPicker from '../ArgumentsPicker'
import StatementContentFields from '../StatementContentFields'
import {
  JointDeclarationOption,
  signJointDeclarationAction,
} from '../../../app/actions/joint-declarations'
import {
  jointDeclarationHref,
  NEW_STATEMENT_HREF,
  signJointDeclarationHref,
  subjectHref,
} from '../../../domain/read-models/hrefs'
import JointDeclarationDoor from './JointDeclarationDoor'
import JointSignaturePanel from './JointSignaturePanel'
import JointSourceHint from './JointSourceHint'
import LockedAction from './LockedAction'
import NewFigurePanel from './NewFigurePanel'
import NewOrganisationPanel from './NewOrganisationPanel'
import NewPositionPanel from './NewPositionPanel'
import NewSubjectPanel from './NewSubjectPanel'
import ProofreadingStatus from './ProofreadingStatus'
import StanceQuestionField from './StanceQuestionField'
import { useStanceQuestions } from './useStanceQuestions'
import { contributionToRead } from './contribution-to-read'
import { useAuthorChoice } from './useAuthorChoice'
import { DeclarationToSign, useJointSignature } from './useJointSignature'
import { useProofreading } from './useProofreading'
import { useTopicChoice } from './useTopicChoice'
import styles from './NewStatementForm.module.css'

interface NamedEntity {
  id: string
  name: string
}

interface NewStatementFormProps {
  initialFigure?: NamedEntity
  initialOrganisation?: NamedEntity
  initialSubject?: { id: string; title: string; slug?: string }
  /** The joint declaration the form opens on, when it was reached to add a signature to it */
  initialDeclaration?: DeclarationToSign
  /**
   * The contributor's reputation. The form works out for itself what it
   * offers: a rank opens actions, and a closed action is said instead of
   * being offered and then refused.
   */
  reputation: number
}

const AUTHOR_KINDS: Record<string, StatementAuthorKind> = {
  'Une personnalité': 'public_figure',
  'Une organisation': 'organisation',
}

const SIGNATURE_UNREAD =
  'Le texte n’a pas pu être lu : la signature n’est pas envoyée tant qu’on ne sait pas ce qu’elle engage.'

const AUTHOR_LABELS: Record<StatementAuthorKind, string> = {
  public_figure: 'Une personnalité',
  organisation: 'Une organisation',
}

export default function NewStatementForm({
  initialFigure,
  initialOrganisation,
  initialSubject,
  initialDeclaration,
  reputation,
}: NewStatementFormProps) {
  const { updateDraft } = useStatementDraft()

  // What the rank opens, read once: the scale is the only source
  const canUseArguments = canPerform(reputation, 'add_argument')
  const canAddSubject = canPerform(reputation, 'add_subject')
  const canAddFigure = canPerform(reputation, 'add_personality')
  const canAddOrganisation = canPerform(reputation, 'add_organisation')

  /*
   * The page speaks of names and titles, which it also renders itself; the
   * hooks speak of labels, because what they hold goes straight into a
   * Combobox. The two vocabularies meet here, once.
   */
  const asChosen = (entity?: { id: string; name: string } | { id: string; title: string }) =>
    entity && { id: entity.id, label: 'name' in entity ? entity.name : entity.title }

  /** Who speaks: the kind, the existing one chosen, or the new one being typed */
  const author = useAuthorChoice({
    figure: asChosen(initialFigure),
    organisation: asChosen(initialOrganisation),
  })

  /** What it is about: the subject and the position defended on it, chosen or created */
  const topic = useTopicChoice({ subject: asChosen(initialSubject) })

  /** Whether this is a signature of a joint declaration, and of which one */
  const joint = useJointSignature(initialDeclaration)

  const [content, setContent] = useState<StatementContentInput>(EMPTY_CONTENT_INPUT)

  /** The date field stays uncontrolled; its day is mirrored here for the question that reads it */
  const [statedOn, setStatedOn] = useState('')

  /** The positions the author already took on the subject, when nobody said how they go with this one */
  const stances = useStanceQuestions(author.input, topic.input, statedOn)

  /** An opinion on the writing, never enforced: it lives and dies here */
  const proofreading = useProofreading()

  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)
  const [successResult, setSuccessResult] = useState<{
    subjectSlug: string
    authorHref: string
    authorLabel: string
  }>()
  const [signedResult, setSignedResult] = useState<{
    declarationHref: string
    signatoryHref: string
    statements: number
  }>()

  const handleSearchFigures = useCallback(async (query: string) => {
    const results = await searchPublicFigures(query)
    return results.map((f) => ({ id: f.id, label: f.name }))
  }, [])

  const handleSearchOrganisations = useCallback(async (query: string) => {
    const results = await searchOrganisations(query)
    return results.map((o) => ({
      id: o.id,
      label: o.acronym ? `${o.name} (${o.acronym})` : o.name,
    }))
  }, [])

  const handleSearchSubjects = useCallback(async (query: string) => {
    const results = await searchSubjects(query)
    return results.map((s) => ({ id: s.id, label: s.title }))
  }, [])

  /** What the statement carries is held here, and mirrored in the preview. */
  const changeContent = useCallback(
    (fields: StatementContentInput) => {
      setContent(fields)
      updateDraft(fields)
    },
    [updateDraft],
  )

  /**
   * The free fields stay uncontrolled; the preview follows by delegation. And
   * a field that changed is a field whose advice no longer applies: inputs
   * bear as id the name their advice came back on.
   */
  const handleFormChange = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      const form = e.currentTarget
      updateDraft({
        sourceName: getFieldValue(form, 'sourceName'),
        statedAt: getFieldValue(form, 'statedAt'),
      })
      setStatedOn(getFieldValue(form, 'statedAt'))
      if (!(e.target instanceof HTMLElement) || !e.target.id) return
      // The hint under the source is about the address the field holds, as it is typed
      if (e.target.id === 'sourceUrl') joint.sourceTyped(getFieldValue(form, 'sourceUrl'))
      proofreading.written(e.target.id)
    },
    [joint, proofreading, updateDraft],
  )

  /** Leaving a field is the end of its writing: the contribution as it stands gets read */
  const handleFormBlur = useCallback(
    (e: FocusEvent<HTMLFormElement>) => {
      if (!(e.target instanceof HTMLElement) || !e.target.id) return
      /*
       * A signature says what its text says: the statement of one's own that
       * may sit behind the door is not being written, so it is not read.
       */
      if (joint.signing) return
      const form = e.currentTarget
      // A source that is a joint declaration's: the statement may be a signature of it
      if (e.target.id === 'sourceUrl') joint.checkSource(getFieldValue(form, 'sourceUrl'))
      proofreading.left(
        e.target.id,
        contributionToRead({
          author,
          topic,
          content,
          source: {
            sourceName: getFieldValue(form, 'sourceName'),
            sourceUrl: getFieldValue(form, 'sourceUrl'),
          },
        }),
      )
    },
    [author, content, joint, proofreading, topic],
  )

  /**
   * Through the door, either way: what the command refused was about the
   * other side, and has nothing to say on this one.
   */
  const forgetRefusal = useCallback(() => {
    setError(undefined)
    setFieldErrors(undefined)
  }, [])

  const { start: startSigning, stop: stopSigning } = joint
  const writeOwnStatement = useCallback(() => {
    forgetRefusal()
    stopSigning()
  }, [forgetRefusal, stopSigning])
  const addSignature = useCallback(
    (declaration?: JointDeclarationOption) => {
      forgetRefusal()
      startSigning(declaration)
    },
    [forgetRefusal, startSigning],
  )

  /** A text is chosen but what signing it makes is not known: the signature would be sent blind */
  const signatureUnread = joint.signing && !!joint.chosen && !joint.preview

  /** A signature is submitted on its own: the text says everything but who signs */
  const submitSignature = useCallback(async () => {
    if (signatureUnread) {
      setIsPending(false)
      setError(SIGNATURE_UNREAD)
      return
    }
    try {
      const result = await signJointDeclarationAction({
        declarationId: joint.declarationId ?? '',
        author: author.input,
      })
      setIsPending(false)
      if (result.success) setSignedResult(result)
      else if (result.error) setError(result.error)
      else setFieldErrors(result.fieldErrors)
    } catch (err) {
      Sentry.captureException(err)
      setError('Une erreur inattendue est survenue. Veuillez réessayer.')
      setIsPending(false)
    }
  }, [author.input, joint.declarationId, signatureUnread])

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      if (joint.signing) return submitSignature()

      const form = e.currentTarget

      const input: NewStatement = {
        author: author.input,
        topic: topic.input,
        content,
        sourceName: getFieldValue(form, 'sourceName'),
        sourceUrl: getFieldValue(form, 'sourceUrl'),
        statedAt: getFieldValue(form, 'statedAt'),
        // The ticked and proposed arguments are carried by the picker's hidden fields
        arguments: readStatementArguments(new FormData(form)),
        judgements: stances.input,
      }

      try {
        const result: ActionResult = await addStatementAction(input)

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
            subjectSlug: result.subjectSlug,
            authorHref: result.authorHref,
            authorLabel: result.authorLabel,
          })
        }
      } catch (err) {
        Sentry.captureException(err)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setIsPending(false)
      }
    },
    [author.input, content, joint.signing, stances.input, submitSignature, topic.input],
  )

  if (signedResult) {
    return (
      <FormSuccess
        title="Signature ajoutée !"
        description={
          signedResult.statements > 1
            ? `${signedResult.statements} prises de position ont été créées, une par sujet du texte.`
            : 'Une prise de position a été créée, sur le sujet du texte.'
        }
        primaryAction={{
          label: 'Ajouter une autre signature',
          href: joint.declarationSlug
            ? signJointDeclarationHref({ slug: joint.declarationSlug })
            : NEW_STATEMENT_HREF,
        }}
        secondaryActions={[
          { label: 'Voir la déclaration commune', href: signedResult.declarationHref },
          ...(signedResult.signatoryHref
            ? [{ label: 'Voir sa page', href: signedResult.signatoryHref }]
            : []),
        ]}
      />
    )
  }

  if (successResult) {
    const secondaryActions = []
    if (successResult.subjectSlug) {
      secondaryActions.push({
        label: 'Voir le sujet',
        href: subjectHref(successResult.subjectSlug),
      })
    }
    if (successResult.authorHref) {
      secondaryActions.push({
        label: successResult.authorLabel,
        href: successResult.authorHref,
      })
    }

    return (
      <FormSuccess
        title="Prise de position ajoutée !"
        primaryAction={{
          label: 'Ajouter une autre prise de position',
          href: NEW_STATEMENT_HREF,
        }}
        secondaryActions={secondaryActions}
      />
    )
  }

  const isOrganisation = author.kind === 'organisation'
  const side = isOrganisation ? author.organisation : author.figure
  /** Who the form is about so far, as a panel can name them */
  const authorName = side.creating ? side.draft.name : (side.chosen?.label ?? '')

  return (
    <form
      onSubmit={handleSubmit}
      onChange={handleFormChange}
      onBlur={handleFormBlur}
      className={styles.form}
    >
      {error && <FormError message={error} />}

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          <span className={styles.step}>1</span> Qui prend position ?
        </legend>
        <Segmented
          ariaLabel="Type d’acteur"
          active={AUTHOR_LABELS[author.kind]}
          items={[{ label: 'Une personnalité' }, { label: 'Une organisation' }]}
          onChange={(label) => {
            // The segmented control speaks in labels; the kind of author belongs to the hook
            const kind = AUTHOR_KINDS[label]
            if (kind) author.changeKind(kind)
          }}
        />
        {isOrganisation && author.organisation.creating ? (
          <NewOrganisationPanel
            organisation={author.organisation.draft}
            onChange={author.organisation.change}
            sources={author.organisation.sources}
            onSources={author.organisation.setSources}
            onCancel={author.organisation.cancelNew}
            errors={fieldErrors}
            advice={proofreading.advice}
          />
        ) : isOrganisation ? (
          <Combobox
            key="organisation"
            label="Organisation"
            id="organisationId"
            name="organisationId"
            required
            placeholder="Tapez un nom ou un sigle…"
            onSearch={handleSearchOrganisations}
            onSelect={(id, label) => author.organisation.choose(id ? { id, label } : undefined)}
            initialItem={author.organisation.chosen}
          />
        ) : author.figure.creating ? (
          <NewFigurePanel
            figure={author.figure.draft}
            onChange={author.figure.change}
            sources={author.figure.sources}
            onSources={author.figure.setSources}
            onCancel={author.figure.cancelNew}
            errors={fieldErrors}
            advice={proofreading.advice}
          />
        ) : (
          <Combobox
            key="public_figure"
            label="Personnalité"
            id="publicFigureId"
            name="publicFigureId"
            required
            placeholder="Tapez un nom…"
            onSearch={handleSearchFigures}
            onSelect={(id, label) => author.figure.choose(id ? { id, label } : undefined)}
            initialItem={author.figure.chosen}
          />
        )}
        {isOrganisation ? (
          <>
            <p className={styles.hint}>
              Un parti, une ONG, un syndicat, une entreprise ou un collectif qui s’exprime en son
              nom : communiqué, programme, vote, action.
            </p>
            {canAddOrganisation ? (
              !author.organisation.creating && (
                <p className={styles.hint}>
                  Elle n’existe pas encore ?{' '}
                  <button
                    type="button"
                    className={styles.inlineAction}
                    onClick={author.organisation.startNew}
                  >
                    la créer ici
                  </button>
                </p>
              )
            ) : (
              <LockedAction
                what="Référencer une organisation"
                action="add_organisation"
                reputation={reputation}
              />
            )}
          </>
        ) : (
          <>
            <p className={styles.hint}>
              La personnalité doit avoir fait l’objet d’au moins deux publications dans des sources
              indépendantes.
            </p>
            {canAddFigure ? (
              !author.figure.creating && (
                <p className={styles.hint}>
                  Elle n’existe pas encore ?{' '}
                  <button
                    type="button"
                    className={styles.inlineAction}
                    onClick={author.figure.startNew}
                  >
                    la créer ici
                  </button>
                </p>
              )
            ) : (
              <LockedAction
                what="Référencer une personnalité"
                action="add_personality"
                reputation={reputation}
              />
            )}
          </>
        )}
      </fieldset>

      <JointDeclarationDoor
        signing={joint.signing}
        onOwn={writeOwnStatement}
        onSignature={() => addSignature()}
      />

      {joint.signing && (
        <JointSignaturePanel
          joint={joint}
          signatoryName={authorName}
          reputation={reputation}
          error={fieldErrors?.author ?? fieldErrors?.positions}
        />
      )}

      {/*
       * The statement of one's own stays mounted behind the door: what was
       * typed in it — the source, the date, the arguments, which live in the
       * inputs themselves — is there again on the way back. Disabled, it takes
       * no part in the browser's validation nor in what a signature sends.
       */}
      <fieldset className={joint.signing ? styles.ownAside : styles.own} disabled={joint.signing}>
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>
            <span className={styles.step}>2</span> Sur quoi ?
          </legend>
          {topic.subject.creating ? (
            <NewSubjectPanel
              subject={topic.subject.draft}
              onChange={topic.subject.change}
              onCancel={topic.subject.cancelNew}
              errors={fieldErrors}
              advice={proofreading.advice}
            />
          ) : (
            <Combobox
              label="Sujet"
              id="subjectId"
              name="subjectId"
              required
              placeholder="Tapez un sujet…"
              onSearch={handleSearchSubjects}
              onSelect={(id, label) => topic.subject.choose(id ? { id, label } : undefined)}
              initialItem={topic.subject.chosen}
            />
          )}
          {canAddSubject ? (
            !topic.subject.creating && (
              <p className={styles.hint}>
                Ce sujet n’existe pas encore ?{' '}
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={topic.subject.startNew}
                >
                  le créer ici
                </button>
                {' — '}vous nommerez sa première position juste en dessous.
              </p>
            )
          ) : (
            <LockedAction what="Référencer un sujet" action="add_subject" reputation={reputation} />
          )}

          <div className={styles.field}>
            <span className={styles.label}>Position défendue</span>
            {topic.position.creating ? (
              <NewPositionPanel
                position={topic.position.draft}
                onChange={topic.position.change}
                errors={fieldErrors}
                advice={proofreading.advice}
                /* A subject being created has nothing to go back to: its first position is the only one */
                onCancel={topic.subject.creating ? undefined : topic.position.cancelNew}
              />
            ) : !topic.subject.chosen ? (
              <p className={styles.hint}>Choisissez d’abord un sujet.</p>
            ) : topic.position.loading ? (
              <p className={styles.hint}>Chargement des positions…</p>
            ) : topic.position.options.length === 0 ? (
              <p className={styles.hint}>Ce sujet n’a pas encore de position.</p>
            ) : (
              <div className={styles.options} role="radiogroup" aria-label="Position défendue">
                {topic.position.options.map((option) => (
                  <label
                    key={option.id}
                    className={
                      option.id === topic.position.chosenId
                        ? `${styles.option} ${styles.optionOn}`
                        : styles.option
                    }
                  >
                    <input
                      type="radio"
                      name="positionId"
                      value={option.id}
                      required
                      checked={option.id === topic.position.chosenId}
                      onChange={() => topic.position.choose(option.id)}
                      className={styles.radio}
                    />
                    <span className={styles.optionTitle}>{option.title}</span>
                  </label>
                ))}
              </div>
            )}
            {fieldErrors?.positionId && (
              <span className={styles.fieldError}>{fieldErrors.positionId}</span>
            )}
            {topic.subject.chosen && !topic.position.creating && !topic.position.loading && (
              <p className={styles.hint}>
                {topic.position.options.length === 0
                  ? 'Nommez la première :'
                  : 'Aucune ne correspond ?'}{' '}
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={topic.position.startNew}
                >
                  proposer une position ici
                </button>
                {' — '}accessible dès l’inscription : nommer une position décrit le débat, elle ne
                le tranche pas.
              </p>
            )}
          </div>

          {stances.questions.map((question) => (
            <StanceQuestionField
              key={question.position.id}
              authorName={authorName}
              question={question}
              compatible={stances.answers[question.position.id]}
              onAnswer={stances.answer}
            />
          ))}
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>
            <span className={styles.step}>3</span> Sur quelles bases ?
          </legend>
          <StatementContentFields
            value={content}
            onChange={changeContent}
            errors={fieldErrors}
            advice={proofreading.advice}
          />
          <p className={styles.hint}>
            Une citation se recopie mot pour mot, sans reformuler ni couper une phrase de manière à
            en changer le sens. Un vote et un acte ne se citent pas : ils se nomment.
          </p>

          <div className={styles.row}>
            <TextField
              label="Nom de la source"
              id="sourceName"
              name="sourceName"
              required
              placeholder="ex : Le Monde, France Inter"
              error={fieldErrors?.sourceName}
              advice={proofreading.advice.sourceName}
            />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="statedAt">
                Date de la prise de position
              </label>
              <input
                className={styles.control}
                id="statedAt"
                name="statedAt"
                type="date"
                required
              />
              {fieldErrors?.statedAt && (
                <span className={styles.fieldError}>{fieldErrors.statedAt}</span>
              )}
            </div>
          </div>

          <TextField
            label="Adresse de la source"
            id="sourceUrl"
            name="sourceUrl"
            required
            placeholder="https://…"
            error={fieldErrors?.sourceUrl}
            advice={proofreading.advice.sourceUrl}
          />
          {joint.hint && (
            <JointSourceHint
              declaration={joint.hint}
              onSign={() => addSignature(joint.hint)}
              onDismiss={joint.dismissHint}
            />
          )}
        </fieldset>

        {canUseArguments ? (
          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>
              <span className={styles.step}>4</span> Arguments mobilisés
            </legend>
            <p className={styles.hint}>
              Nommez les arguments réellement présents dans la citation : on cartographie les
              raisonnements, pas seulement les camps. Un argument est un principe ou un raisonnement
              qui peut servir sur plusieurs sujets, ex : « Dignité de la personne ».
            </p>
            <ArgumentsPicker error={fieldErrors?.arguments} />
          </fieldset>
        ) : (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>
              <span className={styles.step}>4</span> Arguments mobilisés
            </p>
            <p className={styles.hint}>
              Relier une prise de position aux arguments qu’elle mobilise est réservé aux
              contributeur·ices de rang Éloquent. Vous y aurez accès en gagnant de la réputation.
            </p>
          </div>
        )}

        <ProofreadingStatus status={proofreading.status} />
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" disabled={isPending || signatureUnread}>
          {isPending
            ? 'Ajout en cours…'
            : joint.signing
              ? 'Ajouter la signature'
              : 'Ajouter la prise de position'}
        </Button>
        <ComingSoon>
          <span className={styles.draftAction}>Enregistrer le brouillon</span>
        </ComingSoon>
      </div>
    </form>
  )
}

function getFieldValue(form: HTMLFormElement, name: string): string {
  const element = form.elements.namedItem(name)
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return element.value
  }
  if (element instanceof RadioNodeList) {
    return element.value
  }
  return ''
}
