'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  organisationAuthor,
  publicFigureAuthor,
  StatementAuthorKind,
} from '../../../domain/entities/statement'
import { StatementAuthorInput } from '../../../domain/use-cases/create-statement'
import { NotorietySourcePair, notorietySourcePair } from '../../forms/NotorietySources'
import { useStatementDraft } from '../StatementDraft'
import { Chosen, ExistingOrNew } from './existing-or-new'
import { FigureDraft } from './NewFigurePanel'
import { OrganisationDraft } from './NewOrganisationPanel'
import { Created } from './WhatWillBeWritten'

/**
 * What an author has on top of the shared shape: the two notoriety sources,
 * as a pair and not as a list. Their place matters while they are being
 * typed, or what is typed in the second would move up into the first. The
 * domain's list is composed on submission.
 */
interface NotorietySide {
  sources: NotorietySourcePair
  setSources: (sources: NotorietySourcePair) => void
}

export interface AuthorChoice {
  kind: StatementAuthorKind
  changeKind: (kind: StatementAuthorKind) => void
  figure: ExistingOrNew<FigureDraft> & NotorietySide
  organisation: ExistingOrNew<OrganisationDraft> & NotorietySide
  /** What the submission will carry: chosen or created, never both */
  input: StatementAuthorInput
  /** What the submission will create on the author's side, for the recap */
  created: Created[]
}

const EMPTY_FIGURE: FigureDraft = {
  name: '',
  presentation: '',
  wikipediaUrl: '',
  websiteUrl: '',
}

const EMPTY_ORGANISATION: OrganisationDraft = {
  name: '',
  acronym: '',
  organisationType: '',
  presentation: '',
  wikipediaUrl: '',
  websiteUrl: '',
}

/**
 * Who speaks: a personality or an organisation, chosen among the site's own
 * or created in the same gesture as the statement.
 *
 * Both kinds live here, one under the other, and that is the whole point of
 * this file: they fit on one screen. Three times while this form was being
 * written, a defect was fixed in one kind and missed in the other — the field
 * that lost its choice when the panel closed, the panel that wiped what had
 * been typed when reopened — because the twins sat two hundred lines apart.
 *
 * The hook reports to the rail's preview itself, through the shared draft: it
 * owns the author, so it owns both fields that describe him or her.
 *
 * `initial` seeds the states and is read on the first render only, as before
 * the extraction: a page that opens the form on a personality does not change
 * her while the form is being filled.
 */
export function useAuthorChoice(initial: { figure?: Chosen; organisation?: Chosen }): AuthorChoice {
  const { updateDraft } = useStatementDraft()

  const [kind, setKind] = useState<StatementAuthorKind>(
    initial.organisation ? 'organisation' : 'public_figure',
  )

  const [chosenFigure, setChosenFigure] = useState<Chosen | undefined>(initial.figure)
  const [creatingFigure, setCreatingFigure] = useState(false)
  const [figureDraft, setFigureDraft] = useState<FigureDraft>(EMPTY_FIGURE)
  const [figureSources, setFigureSources] = useState<NotorietySourcePair>(() =>
    notorietySourcePair([]),
  )

  const [chosenOrganisation, setChosenOrganisation] = useState<Chosen | undefined>(
    initial.organisation,
  )
  const [creatingOrganisation, setCreatingOrganisation] = useState(false)
  const [organisationDraft, setOrganisationDraft] = useState<OrganisationDraft>(EMPTY_ORGANISATION)
  const [organisationSources, setOrganisationSources] = useState<NotorietySourcePair>(() =>
    notorietySourcePair([]),
  )

  /** Changing the kind of author forgets the choice and closes both panels */
  const changeKind = useCallback(
    (next: StatementAuthorKind) => {
      if (next === kind) return
      setKind(next)
      setChosenFigure(undefined)
      setChosenOrganisation(undefined)
      setCreatingFigure(false)
      setCreatingOrganisation(false)
      updateDraft({ authorKind: next, authorName: '' })
    },
    [kind, updateDraft],
  )

  const figure: ExistingOrNew<FigureDraft> & NotorietySide = {
    chosen: chosenFigure,
    choose: useCallback(
      (chosen?: Chosen) => {
        setChosenFigure(chosen)
        updateDraft({ authorName: chosen?.label ?? '' })
      },
      [updateDraft],
    ),
    creating: creatingFigure,
    startNew: useCallback(() => {
      setCreatingFigure(true)
      updateDraft({ authorName: figureDraft.name })
    }, [figureDraft.name, updateDraft]),
    cancelNew: useCallback(() => {
      setCreatingFigure(false)
      updateDraft({ authorName: chosenFigure?.label ?? '' })
    }, [chosenFigure, updateDraft]),
    draft: figureDraft,
    change: useCallback(
      (draft: FigureDraft) => {
        setFigureDraft(draft)
        updateDraft({ authorName: draft.name })
      },
      [updateDraft],
    ),
    sources: figureSources,
    setSources: setFigureSources,
  }

  const organisation: ExistingOrNew<OrganisationDraft> & NotorietySide = {
    chosen: chosenOrganisation,
    choose: useCallback(
      (chosen?: Chosen) => {
        setChosenOrganisation(chosen)
        updateDraft({ authorName: chosen?.label ?? '' })
      },
      [updateDraft],
    ),
    creating: creatingOrganisation,
    startNew: useCallback(() => {
      setCreatingOrganisation(true)
      updateDraft({ authorName: organisationDraft.name })
    }, [organisationDraft.name, updateDraft]),
    cancelNew: useCallback(() => {
      setCreatingOrganisation(false)
      updateDraft({ authorName: chosenOrganisation?.label ?? '' })
    }, [chosenOrganisation, updateDraft]),
    draft: organisationDraft,
    change: useCallback(
      (draft: OrganisationDraft) => {
        setOrganisationDraft(draft)
        updateDraft({ authorName: draft.name })
      },
      [updateDraft],
    ),
    sources: organisationSources,
    setSources: setOrganisationSources,
  }

  /**
   * One being typed wins over one chosen: both cannot be done at once, and
   * the active kind decides which of the two sides speaks.
   *
   * Memoised because the submission depends on it: a new object on every
   * render would make its `useCallback` an empty promise.
   */
  const input: StatementAuthorInput = useMemo(
    () =>
      kind === 'organisation' && creatingOrganisation
        ? {
            kind: 'new_organisation',
            organisation: {
              ...organisationDraft,
              notorietySources: organisationSources.filter(Boolean),
            },
          }
        : kind === 'public_figure' && creatingFigure
          ? {
              kind: 'new_figure',
              figure: { ...figureDraft, notorietySources: figureSources.filter(Boolean) },
            }
          : {
              kind: 'existing',
              author:
                kind === 'organisation'
                  ? organisationAuthor(chosenOrganisation?.id ?? '')
                  : publicFigureAuthor(chosenFigure?.id ?? ''),
            },
    [
      chosenFigure,
      chosenOrganisation,
      creatingFigure,
      creatingOrganisation,
      figureDraft,
      figureSources,
      kind,
      organisationDraft,
      organisationSources,
    ],
  )

  /**
   * Derived from what leaves, not from a parallel condition: the recap
   * therefore cannot announce anything other than what the command will get.
   */
  const created: Created[] =
    input.kind === 'new_figure'
      ? [{ what: 'La personnalité', name: input.figure.name }]
      : input.kind === 'new_organisation'
        ? [{ what: 'L’organisation', name: input.organisation.name }]
        : []

  return { kind, changeKind, figure, organisation, input, created }
}
