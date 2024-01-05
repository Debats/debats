import { createStore, applyMiddleware, combineReducers, compose } from 'redux'
import { routerReducer, routerMiddleware, syncHistoryWithStore } from 'react-router-redux'
import { map } from 'ramda'
import { useRouterHistory } from 'react-router'
import createHashHistory from 'history/lib/createHashHistory'
import createMemoryHistory from 'history/lib/createMemoryHistory'

import { entitiesReducer } from './reducers'

// Build history
const createHistory = createHashHistory
// const browserHistory = useScroll(useRouterHistory(createHistory))();
const browserHistory = useRouterHistory(createHistory)()

// REDUCERS
const reducer = combineReducers({
  routing: routerReducer,
  entities: entitiesReducer
})

// MIDDLEWARE
const middlewares = [routerMiddleware(browserHistory)]
if (process.env.NODE_ENV !== 'production') {
  middlewares.push(require('redux-logger')({
    stateTransformer: map(state => ((state && state.toJS) ? state.toJS() : state)),
    timestamp: true,
    duration: true,
    collapsed: true,
    predicate: (getState, action) => action.type !== 'APP_LOG'
  }))
}

// STORE
const store = createStore(
  reducer,
  {},
  compose(
    applyMiddleware(...middlewares),
    window.devToolsExtension ? window.devToolsExtension() : f => f
  )
)
const history = syncHistoryWithStore(browserHistory, store)

export { store, history }
