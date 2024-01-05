import { pipe, map, compose, indexBy, prop, when, not, is, groupBy, of, dissoc, assoc, toPairs,
    reduce, replace, toUpper, fromPairs, over, lensProp } from 'ramda';

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

export const flattenAttributes = pipe(
  map(pipe(
    toCamelCaseAttributes,
    mergeAttributes,
    dissoc('attributes'),
    )),
);

export const index = pipe(
  when(isNotArray, of),
  flattenAttributes,
  map(indexBy(getId))
);

export const indexAndGroup = pipe(
  when(isNotArray, of),
  flattenAttributes,
  groupBy(getType),
  map(indexBy(getId))
);
