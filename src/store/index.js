import { createStore, applyMiddleware, combineReducers, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { routerReducer, routerMiddleware, syncHistoryWithStore } from 'react-router-redux';
import { map } from 'ramda';
import { isClientSide } from 'helpers/env';
import { useRouterHistory } from 'react-router';
import createHashHistory from 'history/lib/createHashHistory';
import createMemoryHistory from 'history/lib/createMemoryHistory';

import rootSaga from './sagas';
import { entitiesReducer } from './reducers';

// Build history
const createHistory = isClientSide() ? createHashHistory : createMemoryHistory;
// const browserHistory = useScroll(useRouterHistory(createHistory))();
const browserHistory = useRouterHistory(createHistory)();

// INITIAL STATE
const initialState = isClientSide() ? window.__INITIAL_STATE__ : {};

// REDUCERS
const reducer = combineReducers({
  routing: routerReducer,
  entities: entitiesReducer,
});

// MIDDLEWARE
const sagaMiddleware = createSagaMiddleware();
const middlewares = [routerMiddleware(browserHistory), sagaMiddleware];
if (isClientSide() && process.env.NODE_ENV !== 'production') {
  middlewares.push(require('redux-logger')({
    stateTransformer: map(state => ((state && state.toJS) ? state.toJS() : state)),
    timestamp: true,
    duration: true,
    collapsed: true,
    predicate: (getState, action) => action.type !== 'APP_LOG',
  }));
}

// STORE
const store = createStore(
  reducer,
  initialState,
  compose(
    applyMiddleware(...middlewares),
    window.devToolsExtension ? window.devToolsExtension() : f => f,
    )
);
const history = syncHistoryWithStore(browserHistory, store);

sagaMiddleware.run(rootSaga);

export { store, history };
