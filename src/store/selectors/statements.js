import { values, pipe, not, is, toPairs, lensPath, assoc, over, map, when,
    path, of, compose, dissoc, isNil, first, curry } from 'ramda';
import { log, withConsole, warn } from 'helpers/debug';
import { createSelector } from 'reselect';
import { enrichEntityReference } from './entities';
import { getPublicFigures } from './publicFigures';
import { getPositions } from './positions';
import { getSubjects } from './subjects';

export const getStatements = state => state.entities.statements || null;

export const getAllStatements = pipe(getStatements, values);

const isNotArray = compose(not, is(Array));
const isNotNil = compose(not, isNil);
const whenNotNil = when(isNotNil);

const getRelationshipsPairs = statement => toPairs(statement.relationships);

const overPublicFigures = over(lensPath(['relationships', 'public-figure']));

const enrichWithOne = curry(
    (propertyName, relationshipName, fromCollection, entity) => assoc(
        propertyName,
        compose(
            enrichEntityReference(fromCollection),
            when(is(Array), first),
            path(['relationships', relationshipName, 'data'])
        )(entity),
        entity
    )
);

const injectPublicFigure = enrichWithOne('publicFigure', 'public-figure');
const injectPosition = enrichWithOne('position', 'position');
const injectSubject = enrichWithOne('subject', 'subject');

export const getLatestStatements = createSelector(
    getStatements,
    getPublicFigures,
    getPositions,
    getSubjects,
    (allStatements, allPublicFigures, allPositions, allSubjects) => whenNotNil(
        compose(
            values,
            map(pipe(
                injectPublicFigure(allPublicFigures),
                injectSubject(allSubjects),
                injectPosition(allPositions),
                dissoc('relationthips'),
            ))
        )
    )(allStatements)
);

/*
    export const injectRelations = entity => compose(
    reduce(
        (entity, attributePair) => (assoc(attributePair[0], attributePair[1], entity)),
        entityWithAttributes
    ),
    getRelationshipsPairs,
    map(compose(
        over(lensProp(__),
        )),
        keys,
    )(entity);
*/
