import { curry, assoc, compose, when, take, path, is, map } from 'ramda';

const getEntityByRef = curry(
    (sourceEntities, entityReference) => sourceEntities[entityReference.id]
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
            path(['relationships', relationshipName, 'data'])
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
