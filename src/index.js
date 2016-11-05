import 'react-hot-loader/patch'; // https://github.com/gaearon/redux-devtools/commit/64f58b7010a1b2a71ad16716eb37ac1031f93915
import 'babel-polyfill';

// First boot side effects
import './boot.js';

import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { match } from 'react-router';

// Styles
import 'styles/_main.css';
// Redux
import { store, history } from './store';    // Redux store
import Root from './root';          // App root (Router, Provider, Hot reload ...
import routes from './routes';      // React-router routes

// Init app function
const loadApplication = (DOMElementId) => {
    const DOMElement = document.getElementById(DOMElementId);

    match({ history, routes, location }, () => {
        ReactDOM.render(
            <AppContainer>
                <Root store={store} history={history} />
            </AppContainer>,
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
