import types from '../actions_types';

export const onAddStatementPublicFigureSelection = id => ({
  type: types.ADD_STATEMENT_PUBLIC_FIGURE_SELECTION,
  id,
});
export const onAddStatementSubjectSelection = id => ({
  type: types.ADD_STATEMENT_SUBJECT_SELECTION,
  id,
});
export const onAddStatementPositionSelection = id => ({
  type: types.ADD_STATEMENT_POSITION_SELECTION,
  id,
});

export const onAddStatementUpdateEvidenceUrl = url => ({
  type: types.ADD_STATEMENT_UPDATE_EVIDENCE_URL,
  url,
});
export const onAddStatementUpdateEvidenceFile = file => ({
  type: types.ADD_STATEMENT_UPDATE_EVIDENCE_FILE,
  file,
});

export const onAddStatementValidate = () => ({
  type: types.ADD_STATEMENT_VALIDATE,
});
