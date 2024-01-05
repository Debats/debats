import { createSelector } from 'reselect';
import { prop, propEq, find, pipe, dissoc, when, not, isNil, compose } from 'ramda';
import { getPublicFigures, getSubjects, getPositions, enrichWithRelationships } from './entities';

const isNotNil = compose(not, isNil);

const getAddState = state => state.addStatement;

const injectPositions = enrichWithRelationships('positions', 'positions');

export const getAddStatementPublicFigure = createSelector(
  getAddState,
  getPublicFigures,
  (addState, publicFigures) => find(
    propEq('id', prop('publicFigureId')(addState))
  )(publicFigures)
);

export const getAddStatementSubject = createSelector(
  getAddState,
  getSubjects,
  getPositions,
  (addState, allSubjects, allPositions) => pipe(
    find(propEq('id', prop('subjectId')(addState))),
    when(
      isNotNil,
      pipe(
        injectPositions(allPositions),
        dissoc('relationthips')
      )
    ),
  )(allSubjects)
);

export const getAddStatementPosition = createSelector(
  getAddState,
  getPositions,
  (addState, publicFigures) => find(
    propEq('id', prop('positionId')(addState))
  )(publicFigures)
);

export const getAddStatementEvidenceUrl = createSelector(
  getAddState,
  prop('evidenceUrl')
);

export const getAddStatementEvidenceFile = createSelector(
  getAddState,
  prop('evidenceFile')
);
