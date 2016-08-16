import React from 'react';
import { Route, IndexRoute } from 'react-router';
import { store } from 'state/index';

// Main Page
import Main from 'Main/index';
export default (
    <Route path="/" component={Main} store={store}>
        <IndexRoute
            getComponent={(nextState, done) => {
                require.ensure([], require => {
                    done(null, require('pages/Home').default);
                }, 'home');
            }}
        />
    </Route>
);
