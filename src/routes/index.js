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
        <Route
            path="contact"
            name="contact"
            getComponent={(nextState, done) => {
                require.ensure([], require => {
                    done(null, require('pages/Contact').default);
                }, 'contact');
            }}
        />
        <Route
            path="a-propos"
            name="about"
            getComponent={(nextState, done) => {
                require.ensure([], require => {
                    done(null, require('pages/About').default);
                }, 'about');
            }}
        />
        <Route
            path="mode-d-emploi"
            name="guide"
            getComponent={(nextState, done) => {
                require.ensure([], require => {
                    done(null, require('pages/Guide').default);
                }, 'guide');
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
        <Route path="p" name="publicFigures">
            <IndexRoute
                name="publicFigures.index"
                getComponent={(nextState, done) => {
                    require.ensure([], require => {
                        done(null, require('pages/PublicFigures').default);
                    }, 'publicFigures.index');
                }}
            />
            <Route
                name="publicFigures.page"
                path=":publicFigureSlug"
                getComponent={(nextState, done) => {
                    require.ensure([], require => {
                        done(null, require('pages/publicFigure').default);
                    }, 'publicFigures.page');
                }}
            />
        </Route>
    </Route>
);
