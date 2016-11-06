import {
    assoc, compose, not, allPass, prop, isNil, either, complement,
} from 'ramda';
import actionsTypes from '../actions_types';

const initialState = {
  publicFigureId: null,
  subjectId: null,
  positionId: null,
  statementDate: null,
  evidenceUrl: null,
  evidenceFile: null,
  quote: null,
  note: null,
  tags: [],
};

const isPublicFigureChosen = compose(not, isNil, prop('publicFigureId'));
const isSubjectChosen = compose(not, isNil, prop('publicFigureId'));
const isPositionChosen = compose(not, isNil, prop('publicFigureId'));
const isStatementComplete = allPass([
  compose(not, isNil, prop('statementDate')),
  compose(not, isNil, prop('quote')),
  compose(not, isNil, prop('statementDate')),
  either(
        compose(not, isNil, prop('evidenceUrl')),
        compose(not, isNil, prop('evidenceFile')),
    ),
]);

/* eslint-disable no-unused-vars */
const isPublicFigureMissing = complement(isPublicFigureChosen);
const isSubjectMissing = complement(isSubjectChosen);
const isPositionMissing = complement(isPositionChosen);
const isStatementIncomplete = complement(isStatementComplete);

export const addStatementReducer = (state = initialState, action) => {
  switch (action.type) {
    case actionsTypes.ADD_STATEMENT_PUBLIC_FIGURE_SELECTION: return assoc('publicFigureId', action.id, state);
    case actionsTypes.ADD_STATEMENT_SUBJECT_SELECTION: return assoc('subjectId', action.id, state);
    case actionsTypes.ADD_STATEMENT_POSITION_SELECTION: return assoc('positionId', action.id, state);
    case actionsTypes.ADD_STATEMENT_UPDATE_EVIDENCE_URL: return assoc('evidenceUrl', action.url, state);
    case actionsTypes.ADD_STATEMENT_UPDATE_EVIDENCE_FILE: return assoc('evidenceFile', action.file, state);
    default: return state;
  }
};
