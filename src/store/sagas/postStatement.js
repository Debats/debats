import { takeEvery } from 'redux-saga';
import { call, put } from 'redux-saga/effects';
import actionsTypes from '../actions_types';
import { postStatement } from 'api/debats';

function* postNewStatement(action) {
  yield put({ type: actionsTypes.STATEMENT_POST_BEGIN, payload: action.payload });

  // Gérer d'abord les transferts de fichier sur un ID de transation

  const response = yield call(postStatement);

  // Error actions

  // Success actions
  yield put({ type: actionsTypes.STATEMENT_POST_SUCCESS, payload: action.payload });
}

export function* watchStatementValidation() {
  yield* takeEvery(actionsTypes.ADD_STATEMENT_VALIDATE, postNewStatement);
}
