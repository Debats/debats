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
import {
  organisationAuthor,
  publicFigureAuthor,
  StatementAuthorKind,
} from '../../../domain/entities/statement'
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
import NewPositionPanel from './NewPositionPanel'
import WhatWillBeWritten from './WhatWillBeWritten'
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

  const [authorKind, setAuthorKind] = useState<StatementAuthorKind>(
    initialOrganisation ? 'organisation' : 'public_figure',
  )
  const [selectedFigureId, setSelectedFigureId] = useState(initialFigure?.id ?? '')
  const [selectedOrganisationId, setSelectedOrganisationId] = useState(
    initialOrganisation?.id ?? '',
  )
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubject?.id ?? '')
  const [selectedPositionId, setSelectedPositionId] = useState('')
  /** Une position ouverte en place : le formulaire la porte jusqu'à l'envoi, rien n'est écrit avant */
  const [openingPosition, setOpeningPosition] = useState(false)
  const [newPositionTitle, setNewPositionTitle] = useState('')
  const [newPositionDescription, setNewPositionDescription] = useState('')
  const [content, setContent] = useState<StatementContentInput>(EMPTY_CONTENT_INPUT)

  const [positions, setPositions] = useState<PositionOption[]>([])
  const [loadingPositions, setLoadingPositions] = useState(!!initialSubject?.id)

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

  const changeAuthorKind = useCallback(
    (label: string) => {
      const kind = AUTHOR_KINDS[label]
      if (!kind || kind === authorKind) return
      setAuthorKind(kind)
      setSelectedFigureId('')
      setSelectedOrganisationId('')
      updateDraft({ authorKind: kind, authorName: '' })
    },
    [authorKind, updateDraft],
  )

  const openPosition = useCallback(() => {
    setOpeningPosition(true)
    updateDraft({ positionTitle: '' })
  }, [updateDraft])

  /** Annuler rend la main au choix, et rend aussi celui qu'on avait fait avant d'ouvrir */
  const cancelPosition = useCallback(() => {
    setOpeningPosition(false)
    setNewPositionTitle('')
    setNewPositionDescription('')
    updateDraft({
      positionTitle: positions.find((p) => p.id === selectedPositionId)?.title ?? '',
    })
  }, [positions, selectedPositionId, updateDraft])

  const changeNewPositionTitle = useCallback(
    (value: string) => {
      setNewPositionTitle(value)
      updateDraft({ positionTitle: value })
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

      /** Celle qu'on ouvre, ou celle qu'on a cochée : jamais les deux */
      const position: StatementPositionInput = openingPosition
        ? {
            kind: 'new',
            positionTitle: newPositionTitle,
            positionDescription: newPositionDescription,
          }
        : { kind: 'existing', id: selectedPositionId }

      const input: NewStatement = {
        subjectId: selectedSubjectId,
        author:
          authorKind === 'organisation'
            ? organisationAuthor(selectedOrganisationId)
            : publicFigureAuthor(selectedFigureId),
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
    [
      authorKind,
      content,
      newPositionDescription,
      newPositionTitle,
      openingPosition,
      selectedFigureId,
      selectedOrganisationId,
      selectedPositionId,
      selectedSubjectId,
    ],
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

  const isOrganisation = authorKind === 'organisation'

  return (
    <form onSubmit={handleSubmit} onChange={handleFormChange} className={styles.form}>
      {error && <FormError message={error} />}

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>
          <span className={styles.step}>1</span> Qui prend position ?
        </legend>
        <Segmented
          ariaLabel="Type d’acteur"
          active={AUTHOR_LABELS[authorKind]}
          items={[{ label: 'Une personnalité' }, { label: 'Une organisation' }]}
          onChange={changeAuthorKind}
        />
        {isOrganisation ? (
          <Combobox
            key="organisation"
            label="Organisation"
            id="organisationId"
            name="organisationId"
            required
            placeholder="Tapez un nom ou un sigle…"
            onSearch={handleSearchOrganisations}
            onSelect={(id, label) => {
              setSelectedOrganisationId(id)
              updateDraft({ authorName: label })
            }}
            initialItem={
              initialOrganisation
                ? { id: initialOrganisation.id, label: initialOrganisation.name }
                : undefined
            }
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
            onSelect={(id, label) => {
              setSelectedFigureId(id)
              updateDraft({ authorName: label })
            }}
            initialItem={
              initialFigure ? { id: initialFigure.id, label: initialFigure.name } : undefined
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
              <p className={styles.hint}>
                Elle n’existe pas encore ?{' '}
                <Link href="/o/ajouter" className={styles.hintLink}>
                  Créer une organisation
                </Link>
              </p>
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
              <p className={styles.hint}>
                Elle n’existe pas encore ?{' '}
                <Link href="/p/ajouter" className={styles.hintLink}>
                  Créer une personnalité
                </Link>
              </p>
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
            setOpeningPosition(false)
            setNewPositionTitle('')
            setNewPositionDescription('')
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
          ) : openingPosition ? (
            <NewPositionPanel
              title={newPositionTitle}
              description={newPositionDescription}
              onTitle={changeNewPositionTitle}
              onDescription={setNewPositionDescription}
              onCancel={cancelPosition}
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
          {selectedSubjectId && !openingPosition && !loadingPositions && (
            <p className={styles.hint}>
              {positions.length === 0 ? 'Proposez la première :' : 'Aucune ne correspond ?'}{' '}
              <button type="button" className={styles.inlineAction} onClick={openPosition}>
                {positions.length === 0 ? 'ouvrir une position ici' : 'proposer une position ici'}
              </button>
              {' — '}ouvert dès l’inscription : nommer une position décrit le débat, elle ne le
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

      <WhatWillBeWritten opening={openingPosition} positionTitle={newPositionTitle} />

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
