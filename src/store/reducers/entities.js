import actionsType from '../actions_types';
import { pipe, map, compose, indexBy, prop, when, not, is, groupBy, of, merge, dissoc, assoc, toPairs,
    always, reduce, replace, toUpper, fromPairs, over, lensProp } from 'ramda';
const initialState = {};

// Ramda Shortcuts
// const isNotNil = compose(not, isNil);
const isNotArray = compose(not, is(Array));
const getType = prop('type');
const getId = prop('id');
// const isType = type => compose(equals(type), prop('type'));
// const isTypeSubject = isType('subjects');
// const isTypePublicFigure = isType('public-figures');
// const isTypePosition = isType('positions');

const getAttributesPair = objectWithAttributes => toPairs(objectWithAttributes.attributes);

const mergeAttributes = entityWithAttributes => compose(
    reduce(
        (entity, attributePair) => (assoc(attributePair[0], attributePair[1], entity)),
        entityWithAttributes
    ),
    getAttributesPair,
)(entityWithAttributes);

const overAttributes = over(lensProp('attributes'));

const toCamelCase = replace(
    /-[a-z]/g,
    compose(replace('-', ''), toUpper)
);

const toCamelCaseAttributes = overAttributes(pipe(
    toPairs,
    map(
        ([k, v]) => ([toCamelCase(k), v])
    ),
    fromPairs,
));

const indexAndGroup = pipe(
    when(isNotArray, of),
    map(compose(
        dissoc('attributes'),
        mergeAttributes,
        toCamelCaseAttributes,
    )),
    groupBy(getType),
    map(indexBy(getId))
);

const indexAndGroupMainData = compose(
    indexAndGroup,
    map(assoc('fetched', true)),
    prop('data')
);

const indexAndGroupIncludedData = compose(
    indexAndGroup,
    map(assoc('fetched', true)),
    prop('included')
);

const saveData = data => compose(
    merge(indexAndGroupIncludedData(data)),
    indexAndGroupMainData,
)(data);

export default (state = initialState, action) => {
    switch (action.type) {
        case actionsType.ENTITY_READ: return merge(state, saveData(action.data));
        default: return state;
    }
};
