'use client'

import { useState, useCallback, useEffect, FormEvent } from 'react'
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
import LockedAction from './LockedAction'
import NewFigurePanel from './NewFigurePanel'
import NewOrganisationPanel from './NewOrganisationPanel'
import NewPositionPanel, { PositionDraft } from './NewPositionPanel'
import WhatWillBeWritten, { Created } from './WhatWillBeWritten'
import { useAuthorChoice } from './useAuthorChoice'
import styles from './NewStatementForm.module.css'

interface NamedEntity {
  id: string
  name: string
}

interface NewStatementFormProps {
  initialFigure?: NamedEntity
  initialOrganisation?: NamedEntity
  initialSubject?: { id: string; title: string; slug?: string }
  /**
   * La réputation du contributeur. Le formulaire en déduit lui-même ce qu'il
   * propose : un rang ouvre des actions, et une action fermée se dit au lieu
   * de s'offrir puis de refuser.
   */
  reputation: number
}

const AUTHOR_KINDS: Record<string, StatementAuthorKind> = {
  'Une personnalité': 'public_figure',
  'Une organisation': 'organisation',
}

const AUTHOR_LABELS: Record<StatementAuthorKind, string> = {
  public_figure: 'Une personnalité',
  organisation: 'Une organisation',
}

export default function NewStatementForm({
  initialFigure,
  initialOrganisation,
  initialSubject,
  reputation,
}: NewStatementFormProps) {
  const { updateDraft } = useStatementDraft()

  // Ce que le rang ouvre, lu une fois : le barème est la seule source
  const canUseArguments = canPerform(reputation, 'add_argument')
  const canAddSubject = canPerform(reputation, 'add_subject')
  const canAddFigure = canPerform(reputation, 'add_personality')
  const canAddOrganisation = canPerform(reputation, 'add_organisation')

  /** Qui s'exprime : la sorte, l'existante choisie ou la nouvelle en cours de saisie */
  const author = useAuthorChoice({ figure: initialFigure, organisation: initialOrganisation })

  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubject?.id ?? '')
  const [selectedPositionId, setSelectedPositionId] = useState('')
  /** Une position créée en place : le formulaire la porte jusqu'à l'envoi, rien n'est écrit avant */
  const [creatingPosition, setCreatingPosition] = useState(false)
  const [newPosition, setNewPosition] = useState<PositionDraft>({ title: '', description: '' })
  const [content, setContent] = useState<StatementContentInput>(EMPTY_CONTENT_INPUT)

  const [positions, setPositions] = useState<PositionOption[]>([])
  const [loadingPositions, setLoadingPositions] = useState(!!initialSubject?.id)

  /** Ce que l'envoi créera, dans l'ordre où le formulaire le demande */
  const created: Created[] = [
    ...author.created,
    ...(creatingPosition ? [{ what: 'La position', name: newPosition.title }] : []),
  ]

  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>()
  const [isPending, setIsPending] = useState(false)
  const [successResult, setSuccessResult] = useState<{
    subjectSlug: string
    authorHref: string
    authorLabel: string
  }>()

  useEffect(() => {
    if (!selectedSubjectId) return

    const controller = new AbortController()
    getPositionsForSubject(selectedSubjectId).then((result) => {
      if (controller.signal.aborted) return
      setPositions(result)
      setLoadingPositions(false)
    })
    return () => controller.abort()
  }, [selectedSubjectId])

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

  const startNewPosition = useCallback(() => {
    setCreatingPosition(true)
    updateDraft({ positionTitle: newPosition.title })
  }, [newPosition.title, updateDraft])

  /** Annuler rend la main au choix, et rend celui qu'on avait coché avant la saisie */
  const cancelNewPosition = useCallback(() => {
    setCreatingPosition(false)
    updateDraft({
      positionTitle: positions.find((p) => p.id === selectedPositionId)?.title ?? '',
    })
  }, [positions, selectedPositionId, updateDraft])

  const changePosition = useCallback(
    (position: PositionDraft) => {
      setNewPosition(position)
      updateDraft({ positionTitle: position.title })
    },
    [updateDraft],
  )

  const selectPosition = useCallback(
    (id: string) => {
      setSelectedPositionId(id)
      updateDraft({ positionTitle: positions.find((p) => p.id === id)?.title ?? '' })
    },
    [positions, updateDraft],
  )

  /** Ce que porte la prise de position est tenu ici, et reflété dans l'aperçu. */
  const changeContent = useCallback(
    (fields: StatementContentInput) => {
      setContent(fields)
      updateDraft(fields)
    },
    [updateDraft],
  )

  /** Les champs libres restent non contrôlés ; l'aperçu se met à jour par délégation. */
  const handleFormChange = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      const form = e.currentTarget
      updateDraft({
        sourceName: getFieldValue(form, 'sourceName'),
        statedAt: getFieldValue(form, 'statedAt'),
      })
    },
    [updateDraft],
  )

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(undefined)
      setFieldErrors(undefined)
      setIsPending(true)

      const form = e.currentTarget

      /** Celle qu'on crée, ou celle qu'on a cochée : jamais les deux */
      const position: StatementPositionInput = creatingPosition
        ? {
            kind: 'new',
            positionTitle: newPosition.title,
            positionDescription: newPosition.description,
          }
        : { kind: 'existing', id: selectedPositionId }

      const input: NewStatement = {
        subjectId: selectedSubjectId,
        author: author.input,
        position,
        content,
        sourceName: getFieldValue(form, 'sourceName'),
        sourceUrl: getFieldValue(form, 'sourceUrl'),
        statedAt: getFieldValue(form, 'statedAt'),
        // Les arguments cochés et proposés sont portés par les champs cachés du sélecteur
        arguments: readStatementArguments(new FormData(form)),
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
    [author.input, content, newPosition, creatingPosition, selectedPositionId, selectedSubjectId],
  )

  if (successResult) {
    const secondaryActions = []
    if (successResult.subjectSlug) {
      secondaryActions.push({
        label: 'Voir le sujet',
        href: `/s/${successResult.subjectSlug}`,
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
          href: '/nouvelle-prise-de-position',
        }}
        secondaryActions={secondaryActions}
      />
    )
  }

  const isOrganisation = author.kind === 'organisation'

  return (
    <form onSubmit={handleSubmit} onChange={handleFormChange} className={styles.form}>
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
            // Le segmenté parle en libellés ; la sorte d'auteur est au hook
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
            onSelect={(id, label) =>
              author.organisation.choose(id ? { id, name: label } : undefined)
            }
            initialItem={
              author.organisation.chosen
                ? {
                    id: author.organisation.chosen.id,
                    label: author.organisation.chosen.name,
                  }
                : undefined
            }
          />
        ) : author.figure.creating ? (
          <NewFigurePanel
            figure={author.figure.draft}
            onChange={author.figure.change}
            sources={author.figure.sources}
            onSources={author.figure.setSources}
            onCancel={author.figure.cancelNew}
            errors={fieldErrors}
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
            onSelect={(id, label) => author.figure.choose(id ? { id, name: label } : undefined)}
            initialItem={
              author.figure.chosen
                ? { id: author.figure.chosen.id, label: author.figure.chosen.name }
                : undefined
            }
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

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          <span className={styles.step}>2</span> Sur quoi ?
        </legend>
        <Combobox
          label="Sujet"
          id="subjectId"
          name="subjectId"
          required
          placeholder="Tapez un sujet…"
          onSearch={handleSearchSubjects}
          onSelect={(id, label) => {
            setSelectedSubjectId(id)
            setPositions([])
            setSelectedPositionId('')
            setCreatingPosition(false)
            // Les positions appartiennent au sujet : changer de sujet rend celle qu'on saisissait caduque
            setNewPosition({ title: '', description: '' })
            setLoadingPositions(!!id)
            updateDraft({ subjectTitle: label, positionTitle: '' })
          }}
          initialItem={
            initialSubject ? { id: initialSubject.id, label: initialSubject.title } : undefined
          }
        />
        {canAddSubject ? (
          <p className={styles.hint}>
            Ce sujet n’existe pas encore ?{' '}
            <Link href="/s/ajouter" className={styles.hintLink}>
              Créer un sujet
            </Link>
          </p>
        ) : (
          <LockedAction what="Référencer un sujet" action="add_subject" reputation={reputation} />
        )}

        <div className={styles.field}>
          <span className={styles.label}>Position défendue</span>
          {!selectedSubjectId ? (
            <p className={styles.hint}>Choisissez d’abord un sujet.</p>
          ) : creatingPosition ? (
            <NewPositionPanel
              position={newPosition}
              onChange={changePosition}
              onCancel={cancelNewPosition}
              errors={fieldErrors}
            />
          ) : loadingPositions ? (
            <p className={styles.hint}>Chargement des positions…</p>
          ) : positions.length === 0 ? (
            <p className={styles.hint}>Ce sujet n’a pas encore de position.</p>
          ) : (
            <div className={styles.options} role="radiogroup" aria-label="Position défendue">
              {positions.map((position) => (
                <label
                  key={position.id}
                  className={
                    position.id === selectedPositionId
                      ? `${styles.option} ${styles.optionOn}`
                      : styles.option
                  }
                >
                  <input
                    type="radio"
                    name="positionId"
                    value={position.id}
                    required
                    checked={position.id === selectedPositionId}
                    onChange={() => selectPosition(position.id)}
                    className={styles.radio}
                  />
                  <span className={styles.optionTitle}>{position.title}</span>
                </label>
              ))}
            </div>
          )}
          {fieldErrors?.positionId && (
            <span className={styles.fieldError}>{fieldErrors.positionId}</span>
          )}
          {selectedSubjectId && !creatingPosition && !loadingPositions && (
            <p className={styles.hint}>
              {positions.length === 0 ? 'Nommez la première :' : 'Aucune ne correspond ?'}{' '}
              <button type="button" className={styles.inlineAction} onClick={startNewPosition}>
                proposer une position ici
              </button>
              {' — '}accessible dès l’inscription : nommer une position décrit le débat, elle ne le
              tranche pas.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          <span className={styles.step}>3</span> Sur quelles bases ?
        </legend>
        <StatementContentFields value={content} onChange={changeContent} errors={fieldErrors} />
        <p className={styles.hint}>
          Une citation se recopie mot pour mot, sans reformuler ni couper une phrase de manière à en
          changer le sens. Un vote et un acte ne se citent pas : ils se nomment.
        </p>

        <div className={styles.row}>
          <TextField
            label="Nom de la source"
            id="sourceName"
            name="sourceName"
            required
            placeholder="ex : Le Monde, France Inter"
            error={fieldErrors?.sourceName}
          />
          <div className={styles.field}>
            <label className={styles.label} htmlFor="statedAt">
              Date de la prise de position
            </label>
            <input className={styles.control} id="statedAt" name="statedAt" type="date" required />
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
        />
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

      <WhatWillBeWritten created={created} />

      <div className={styles.actions}>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Ajout en cours…' : 'Ajouter la prise de position'}
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
