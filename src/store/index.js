import { createStore, applyMiddleware, combineReducers, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { routerReducer } from 'react-router-redux';
import { map } from 'ramda';
import { isClientSide } from 'helpers/env';
import rootSaga from './sagas';
import { entitiesReducer, addStatementReducer } from './reducers';

// INITIAL STATE
const initialState = isClientSide() ? window.__INITIAL_STATE__ : {};

// REDUCERS
const reducer = combineReducers({
    routing: routerReducer,
    entities: entitiesReducer,
    addStatement: addStatementReducer,
});

// MIDDLEWARE
const sagaMiddleware = createSagaMiddleware();
const middlewares = [sagaMiddleware];
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

sagaMiddleware.run(rootSaga);

export { store };
