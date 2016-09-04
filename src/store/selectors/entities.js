import { values, pipe, curry, toPairs } from 'ramda';
import { log, warn, withConsole } from 'helpers/debug';

import { createSelector } from 'reselect';

const getEntities = state => state.entities;

const getRelationshipsPairs = objectWithAttributes => toPairs(objectWithAttributes.relationships);

export const enrichEntityReference = curry(
    (sourceEntities, entityReference) => sourceEntities[entityReference.id]
);

/* export const injectRelations = entity => compose(
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
