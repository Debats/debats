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
import { FigureDraft } from './NewFigurePanel'
import { OrganisationDraft } from './NewOrganisationPanel'
import { Created } from './WhatWillBeWritten'

/**
 * L'existante qu'on a choisie, avec son nom. L'identifiant ne suffit pas : le
 * Combobox se démonte quand le panneau de saisie s'affiche, et il faut pouvoir
 * le remonter sur ce qui était choisi plutôt que vide.
 */
export interface Chosen {
  id: string
  name: string
}

/**
 * Un champ d'auteur dans l'un de ses deux états : une existante choisie dans
 * la liste du site, ou une nouvelle en cours de saisie. Jamais les deux —
 * `AuthorChoice.input` tranche, et rend l'union que la commande attend.
 */
interface ExistingOrNew<Draft> {
  chosen?: Chosen
  choose: (chosen?: Chosen) => void
  /** Vrai quand on décrit une nouvelle au lieu d'en choisir une */
  creating: boolean
  startNew: () => void
  /**
   * Revenir au choix, et retrouver celui qu'on avait fait avant. Ce qui a été
   * tapé reste : annuler veut dire « laisse-moi revoir les existantes », pas
   * « jette ce que j'ai écrit ».
   */
  cancelNew: () => void
  draft: Draft
  change: (draft: Draft) => void
  /**
   * Les deux sources de notoriété, en paire et non en liste : leur place
   * compte tant qu'on les saisit, sinon ce qu'on tape dans la seconde
   * remonterait dans la première. La liste du domaine se compose à l'envoi.
   */
  sources: NotorietySourcePair
  setSources: (sources: NotorietySourcePair) => void
}

export interface AuthorChoice {
  kind: StatementAuthorKind
  changeKind: (kind: StatementAuthorKind) => void
  figure: ExistingOrNew<FigureDraft>
  organisation: ExistingOrNew<OrganisationDraft>
  /** Ce que l'envoi portera : choisie ou créée, jamais les deux */
  input: StatementAuthorInput
  /** Ce que l'envoi créera du côté auteur, pour le récapitulatif */
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
 * Qui s'exprime : une personnalité ou une organisation, choisie parmi celles
 * du site ou créée dans le même geste que la prise de position.
 *
 * Les deux sortes vivent ici, l'une sous l'autre, et c'est tout l'intérêt du
 * fichier : elles tiennent sur un écran. Trois fois pendant l'écriture de ce
 * formulaire, un défaut a été corrigé dans une sorte et oublié dans l'autre —
 * le champ qui perdait son choix au repli, la reprise de saisie qui effaçait
 * ce qui avait été tapé — parce que les deux jumelles étaient à deux cents
 * lignes l'une de l'autre.
 *
 * Le hook rapporte lui-même à l'aperçu du rail, par le brouillon partagé : il
 * possède l'auteur, donc il possède les deux champs qui le décrivent.
 *
 * `initial` amorce les états et n'est lu qu'au premier rendu, comme avant
 * l'extraction : la page qui ouvre le formulaire sur une personnalité ne la
 * change pas en cours de saisie.
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

  /** Changer de sorte d'auteur oublie le choix et referme les deux panneaux */
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

  const figure: ExistingOrNew<FigureDraft> = {
    chosen: chosenFigure,
    choose: useCallback(
      (chosen?: Chosen) => {
        setChosenFigure(chosen)
        updateDraft({ authorName: chosen?.name ?? '' })
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
      updateDraft({ authorName: chosenFigure?.name ?? '' })
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

  const organisation: ExistingOrNew<OrganisationDraft> = {
    chosen: chosenOrganisation,
    choose: useCallback(
      (chosen?: Chosen) => {
        setChosenOrganisation(chosen)
        updateDraft({ authorName: chosen?.name ?? '' })
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
      updateDraft({ authorName: chosenOrganisation?.name ?? '' })
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
   * Une saisie en cours l'emporte sur un choix : on ne peut pas faire les
   * deux, et la sorte active décide lequel des deux côtés parle.
   *
   * Mémoïsé parce que l'envoi en dépend : un objet neuf à chaque rendu ferait
   * de son `useCallback` une promesse vide.
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
   * Déduit de ce qui part, et non d'une condition parallèle : le récapitulatif
   * ne peut donc pas annoncer autre chose que ce que la commande recevra.
   */
  const created: Created[] =
    input.kind === 'new_figure'
      ? [{ what: 'La personnalité', name: input.figure.name }]
      : input.kind === 'new_organisation'
        ? [{ what: 'L’organisation', name: input.organisation.name }]
        : []

  return { kind, changeKind, figure, organisation, input, created }
}
