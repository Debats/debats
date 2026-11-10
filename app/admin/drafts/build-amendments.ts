import {
  DraftAuthor,
  DraftStatement,
  draftOrganisationAuthor,
  draftPublicFigureAuthor,
} from '../../../domain/entities/draft-statement'
import { OrganisationType } from '../../../domain/entities/organisation'
import { DraftResolution } from '../../../domain/use-cases/resolve-draft'
import {
  contentFieldsOf,
  StatementContentInput,
} from '../../../domain/use-cases/validate-statement-fields'
import { DraftAmendments } from '../../actions/draft-amendments'

/** The values of the amend form, by the names the assistant knows them under; the ids beside them */
export type AmendValues = Omit<AmendFormState, 'selectedPositionTitle'> & {
  subjectId: string | null
  selectedPositionId: string
}

/** The form as it opens: the draft, placed on what the site already has of it */
export function amendValuesOf(draft: DraftStatement, resolution: DraftResolution): AmendValues {
  const { author } = draft
  return {
    authorMode: resolution.author.found ? 'existing' : 'new',
    authorName: author.name,
    authorPresentation: author.data?.presentation ?? '',
    authorWikipedia: author.data?.wikipediaUrl ?? '',
    authorNotorietySources: author.data?.notorietySources ?? ['', ''],
    authorOrganisationType:
      author.kind === 'organisation'
        ? (author.data?.organisationType ?? 'association')
        : 'association',
    subjectMode: resolution.subject.found ? 'existing' : 'new',
    subjectId: resolution.subject.found ? resolution.subject.entity.id : null,
    subjectTitle: draft.subjectTitle,
    subjectPresentation: draft.subjectData?.presentation ?? '',
    subjectProblem: draft.subjectData?.problem ?? '',
    positionMode: resolution.position.found ? 'existing' : 'new',
    selectedPositionId: resolution.position.found ? resolution.position.entity.id : '',
    positionTitle: draft.positionTitle,
    positionDescription: draft.positionData?.description ?? '',
    sourceName: draft.sourceName,
    content: contentFieldsOf(draft.content),
  }
}

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
  /** What the draft carries, field by field, as the form holds it */
  content: StatementContentInput
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
    // Either the admin picked another entity, or they confirmed this one exists
    // after all — both mean the creation data must go.
    const nameChanged = state.authorName !== draft.author.name
    const staleCreationData = !resolution.author.found && draft.author.data !== null
    if (nameChanged || staleCreationData) {
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
  // The content is one value: any field of it changing re-states the whole of it
  const recorded = contentFieldsOf(draft.content)
  const keys = Object.keys(recorded) as Array<keyof StatementContentInput>
  if (keys.some((key) => state.content[key] !== recorded[key])) {
    amendments.content = state.content
  }

  return amendments
}
