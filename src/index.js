import 'react-hot-loader/patch'; // https://github.com/gaearon/redux-devtools/commit/64f58b7010a1b2a71ad16716eb37ac1031f93915
import 'babel-polyfill';

// First boot side effects
import './boot.js';

import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { useRouterHistory, match } from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';
import { setAccessToken, setEndpointHost, setEndpointPath } from 'redux-json-api';
import createHashHistory from 'history/lib/createHashHistory';
import createMemoryHistory from 'history/lib/createMemoryHistory';
import Config from 'Config';
import { isClientSide } from 'helpers/env';
// import useScroll from 'scroll-behavior/lib/useScrollToTop';

// Styles
import 'styles/_main.css';
// Redux
import { store } from './store';    // Redux store
import Root from './root';          // App root (Router, Provider, Hot reload ...
import routes from './routes';      // React-router routes

// Build history
const createHistory = isClientSide() ? createHashHistory : createMemoryHistory;
// const browserHistory = useScroll(useRouterHistory(createHistory))();
const browserHistory = useRouterHistory(createHistory)();
const history = syncHistoryWithStore(browserHistory, store);

// Setup API
store.dispatch(setEndpointHost(Config.api.debats.endpointHost));
store.dispatch(setEndpointPath('/'));

// Init app function
const loadApplication = (DOMElementId) => {
    const DOMElement = document.getElementById(DOMElementId);

    match({ history, routes, location }, () => {
        ReactDOM.render(
                <Root store={store} history={history} />,
            DOMElement
        );
    });

    if (module.hot) {
        module.hot.accept('./root/index.jsx', () => {
            // If you use Webpack 2 in ES modules mode, you can
            // use <App /> here rather than require() a <NextApp />.
            const NextApp = require('./root/index').default;

            ReactDOM.render(
                <AppContainer>
                    <NextApp store={store} history={history} />
                </AppContainer>,
                DOMElement
            );
        });
    }
};

export { store, history };

loadApplication('react-content');
