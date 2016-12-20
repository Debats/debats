import { identity } from 'ramda';
import { takeEvery } from 'redux-saga';
import { call, put } from 'redux-saga/effects';
import { getSubjects, getStatements, getPositions } from 'api/debats';

import actionsTypes from '../actions_types';

const getApiCallFor = (entityType, entityRequest) => {
  switch (entityType) {
    case 'statements': return getStatements;
    case 'subjects':
      switch (entityRequest) {
        case 'hottest': return getSubjects;
        default: return identity;
      }
    case 'publicFigures':
      switch (entityRequest) {
        case 'hottest': return getSubjects;
        case 'all': return getSubjects;
        default: return identity;
      }
    default: return identity;
  }
};

function* fetchEntityIfNeeded(action) {
    // Test Do we have to call API

  const apiCall = getApiCallFor(action.entityType, (
    action.accessType === 'list' ? action.listType : action.accessedId
    ));

    // Call API
  const response = yield call(apiCall);

    // Error actions

    // Success actions
  yield put({ type: actionsTypes.ENTITY_READ, data: response.data });
}

export function* watchEntityAccess() {
  yield* takeEvery(actionsTypes.ENTITY_ACCESS, fetchEntityIfNeeded);
}
function* fetchPositionsOfSubject(action) {
  if (action.id) {
        // Call API
    const response = yield call(getPositions, action.id);

        // Error actions

        // Success actions
    yield put({ type: actionsTypes.ENTITY_READ, data: response.data });
  }
}

export function* watchSubjectSelection() {
  yield* takeEvery(actionsTypes.ADD_STATEMENT_SUBJECT_SELECTION, fetchPositionsOfSubject);
}
