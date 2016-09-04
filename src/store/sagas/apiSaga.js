import actionsTypes from '../actions_types';
import { takeEvery } from 'redux-saga';
import { call, put } from 'redux-saga/effects';
import { getSubjects, getStatements } from 'api/debats';

export function* fetchEntityIfNeeded() {
    // Do we have to call API
    console.warn('jarfaoui', 'fetchEntityIfNeeded');
    // Call API
    const response = yield call(getStatements);
    // Success / Error actions
    yield put({ type: actionsTypes.ENTITY_READ, data: response.data });
}

export function* watchEntityAccess() {
    console.warn('jarfaoui', 'watchEntityAccess');
    yield* takeEvery(actionsTypes.ENTITY_ACCESS, fetchEntityIfNeeded);
}
