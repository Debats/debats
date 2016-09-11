import React from 'react';
import { Route, IndexRoute } from 'react-router';

// Main Page
import Main from 'Main/index';
export default (
    <Route path="/" component={Main}>
        <IndexRoute
            getComponent={(nextState, done) => {
                require.ensure([], require => {
                    done(null, require('pages/Home').default);
                }, 'home');
            }}
        />
        <Route path="s" name="subjects">
            <IndexRoute
                name="subjects.index"
                getComponent={(nextState, done) => {
                    require.ensure([], require => {
                        done(null, require('pages/Subjects').default);
                    }, 'subjects.index');
                }}
            />
            <Route
                name="subjects.page"
                path=":subjectSlug"
                getComponent={(nextState, done) => {
                    require.ensure([], require => {
                        done(null, require('pages/Subject').default);
                    }, 'subjects.page');
                }}
            />
        </Route>
    </Route>
);
