import {
  DraftAuthor,
  DraftStatement,
  draftOrganisationAuthor,
  draftPublicFigureAuthor,
} from '../../../domain/entities/draft-statement'
import { OrganisationType } from '../../../domain/entities/organisation'
import { DraftResolution } from '../../../domain/use-cases/resolve-draft'
import { DraftAmendments } from '../../actions/amend-and-validate-draft-action'

export type AmendFormState = {
  authorMode: 'existing' | 'new'
  authorName: string
  authorPresentation: string
  authorWikipedia: string
  authorNotorietySources: string[]
  /** Only read when the author is an organisation being created. */
  authorOrganisationType: OrganisationType
  subjectMode: 'existing' | 'new'
  subjectTitle: string
  subjectPresentation: string
  subjectProblem: string
  positionMode: 'existing' | 'new'
  selectedPositionTitle: string | null
  positionTitle: string
  positionDescription: string
  sourceName: string
  quote: string
}

/** Rebuilds the author, keeping its kind and the acronym the form does not expose. */
function authorWithData(
  draftAuthor: DraftAuthor,
  state: AmendFormState,
  data: { presentation: string; wikipediaUrl?: string; notorietySources?: string[] } | null,
): DraftAuthor {
  if (draftAuthor.kind === 'organisation') {
    if (data === null) return draftOrganisationAuthor(state.authorName)
    return draftOrganisationAuthor(state.authorName, {
      ...data,
      organisationType: state.authorOrganisationType,
      ...(draftAuthor.data?.acronym ? { acronym: draftAuthor.data.acronym } : {}),
    })
  }
  return draftPublicFigureAuthor(state.authorName, data)
}

export function buildAmendments(
  draft: DraftStatement,
  resolution: DraftResolution,
  state: AmendFormState,
): DraftAmendments {
  const amendments: DraftAmendments = {}

  // Author
  if (state.authorMode === 'existing') {
    if (state.authorName !== draft.author.name) {
      amendments.author = authorWithData(draft.author, state, null)
    } else if (!resolution.author.found && draft.author.data !== null) {
      // Admin switched to existing mode but name matches → entity now exists, clear creation data
      amendments.author = authorWithData(draft.author, state, null)
    }
  } else {
    const filteredSources = state.authorNotorietySources.filter((s) => s.trim() !== '')
    const newData = {
      presentation: state.authorPresentation,
      ...(state.authorWikipedia ? { wikipediaUrl: state.authorWikipedia } : {}),
      ...(filteredSources.length > 0 ? { notorietySources: filteredSources } : {}),
    }
    const originalSources = draft.author.data?.notorietySources ?? []
    const sourcesChanged =
      filteredSources.length !== originalSources.length ||
      filteredSources.some((s, i) => s !== originalSources[i])
    const organisationTypeChanged =
      draft.author.kind === 'organisation' &&
      state.authorOrganisationType !== draft.author.data?.organisationType
    const dataChanged =
      state.authorPresentation !== (draft.author.data?.presentation ?? '') ||
      state.authorWikipedia !== (draft.author.data?.wikipediaUrl ?? '') ||
      sourcesChanged ||
      organisationTypeChanged
    if (dataChanged || state.authorName !== draft.author.name) {
      amendments.author = authorWithData(draft.author, state, newData)
    }
  }

  // Subject
  if (state.subjectMode === 'existing') {
    if (state.subjectTitle !== draft.subjectTitle) {
      amendments.subjectTitle = state.subjectTitle
      amendments.subjectData = null
    } else if (!resolution.subject.found && draft.subjectData !== null) {
      amendments.subjectData = null
    }
  } else {
    if (state.subjectTitle !== draft.subjectTitle) amendments.subjectTitle = state.subjectTitle
    const changed =
      state.subjectPresentation !== (draft.subjectData?.presentation ?? '') ||
      state.subjectProblem !== (draft.subjectData?.problem ?? '')
    if (changed) {
      amendments.subjectData = {
        presentation: state.subjectPresentation,
        problem: state.subjectProblem,
      }
    }
  }

  // Position
  if (state.positionMode === 'existing' && state.selectedPositionTitle) {
    if (state.selectedPositionTitle !== draft.positionTitle) {
      amendments.positionTitle = state.selectedPositionTitle
      amendments.positionData = null
    } else if (!resolution.position.found && draft.positionData !== null) {
      amendments.positionData = null
    }
  } else {
    if (state.positionTitle !== draft.positionTitle) amendments.positionTitle = state.positionTitle
    if (state.positionDescription !== (draft.positionData?.description ?? '')) {
      amendments.positionData = { description: state.positionDescription }
    }
  }

  // Statement fields
  if (state.sourceName !== draft.sourceName) amendments.sourceName = state.sourceName
  if (state.quote !== draft.quote) amendments.quote = state.quote

  return amendments
}
