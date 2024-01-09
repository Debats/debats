import React, { PropTypes } from 'react'
import { ApolloProvider } from 'react-apollo'
import { Provider } from 'react-redux'
import { Router } from 'react-router'
import routes from '../routes'
import { apolloClient } from '../api/debats_api'

const Root = ({ store, history }) => (
  <ApolloProvider client={apolloClient}>
    <Provider store={store}>
      <Router history={history} routes={routes} />
    </Provider>
  </ApolloProvider>
)

Root.propTypes = {
  store: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired
}

export default Root
