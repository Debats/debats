import { curry, assoc, compose, when, take, path, is, map, isNil, always, values, propEq, ifElse, pipe, find } from 'ramda';
export const getSubjects = state => values(state.entities.subjects);
export const getPositions = state => values(state.entities.positions);
export const getStatements = state => values(state.entities.statements);
export const getPublicFigures = state => values(state.entities['public-figures']);

import { withConsole, warn } from 'helpers/debug';

const getEntityByRef = curry(
    (sourceEntities, entityReference) => ifElse(
        isNil,
        always(entityReference),                  // No source entities yet, return reference object
        pipe(
            find(propEq('id', entityReference.id)),
            when(isNil, always(entityReference)), // Entity not fetched yet, return reference object
        ),
    )(sourceEntities)
);


/**
 * Exemple :
 * const injectPublicFigure = enrichWithRelationship('publicFigure', 'public-figure');
 */
export const enrichWithRelationship = curry(
    (propertyName, relationshipName, fromCollection, entity) => assoc(
        propertyName,
        compose(
            getEntityByRef(fromCollection),
            when(is(Array), take(1)),
            path(['relationships', relationshipName, 'data']),
        )(entity),
        entity
    )
);


/**
 * Exemple :
 * const injectRemarquablePublicFigures
 *        = enrichWithRelationships('remarquablePublicFigures', 'remarquable-public-figures');
 */
export const enrichWithRelationships = curry(
    (propertyName, relationshipName, fromCollection, entity) => assoc(
        propertyName,
        compose(
            map(getEntityByRef(fromCollection)),
            path(['relationships', relationshipName, 'data'])
        )(entity),
        entity
    )
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
