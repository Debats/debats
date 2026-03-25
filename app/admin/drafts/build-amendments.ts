import { DraftStatement } from '../../../domain/entities/draft-statement'
import { DraftResolution } from '../../../domain/use-cases/resolve-draft'
import { DraftAmendments } from '../../actions/amend-and-validate-draft-action'

export type AmendFormState = {
  figureMode: 'existing' | 'new'
  figureName: string
  figurePresentation: string
  figureWikipedia: string
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

export function buildAmendments(
  draft: DraftStatement,
  resolution: DraftResolution,
  state: AmendFormState,
): DraftAmendments {
  const amendments: DraftAmendments = {}

  // Figure
  if (state.figureMode === 'existing') {
    if (state.figureName !== draft.publicFigureName) {
      amendments.publicFigureName = state.figureName
      amendments.publicFigureData = null
    } else if (!resolution.publicFigure.found && draft.publicFigureData !== null) {
      // Admin switched to existing mode but name matches → entity now exists, clear creation data
      amendments.publicFigureData = null
    }
  } else {
    if (state.figureName !== draft.publicFigureName) amendments.publicFigureName = state.figureName
    const newData = {
      presentation: state.figurePresentation,
      ...(state.figureWikipedia ? { wikipediaUrl: state.figureWikipedia } : {}),
    }
    const changed =
      state.figurePresentation !== (draft.publicFigureData?.presentation ?? '') ||
      state.figureWikipedia !== (draft.publicFigureData?.wikipediaUrl ?? '')
    if (changed) amendments.publicFigureData = newData
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
