import actionsType from '../actions_types';
import { pipe, map, isNil, compose, chain, indexBy, concat, pair,
    prop, into, when, not, over, lensProp, cond, equals, identity,
    assoc, propEq, merge,
} from 'ramda';

const initialState = {};

// Ramda Shortcuts
const isNotNil = compose(not, isNil);
const istNotArray = compose(not, is(Array));

const saveEntity = (rawEntity) => ()

const saveData = pipe(
    when(isNotArray, of),
    
);

const copyResourcesToRoot = (deepResource) => (
    compose(
        into([deepResource], when(
            isNotNil,
            chain(copyResourcesToRoot),
        )),
        map(compose(
            res => assoc('sortId', concat(`${deepResource.sortId || 0}-`)(res.index), res),
            assoc('parent', deepResource.key),
        )),
        prop('resources'),
    )(deepResource)
);

const overResources = over(lensProp('resources'));
const stripSubResources = when(
    compose(not, isNil, prop('resources')),
    overResources(map(prop('key'))),
);

const isType = type => compose(equals(type), prop('type'));
const condIsType = compose(pair, isType);

const isTypeSaleThen = condIsType('sale');
const isTypeNavigationThen = condIsType('navigation');
const isTypeProductThen = condIsType('product');
const otherwise = pair(() => true);

const hasUri = compose(isNotNil, prop('uri'));
const overUri = over(lensProp('uri'));
const concatUriWith = compose(overUri, concat);

const prefixUri = when(hasUri)(cond([
    isTypeSaleThen(concatUriWith('/catalog')),
    isTypeNavigationThen(concatUriWith('/catalog')),
    isTypeProductThen(concatUriWith('/product')),
    otherwise(identity),
]));

const whenNotSale = when(compose(not, propEq('type', 'sale')));
const setSaleKey = assoc('sale');

const createQueryString = res => merge(res)({
    query: {
        key: res.key,
        evtKey: res.sale || res.key,
    },
});
/* *************************** */

const flattenResources = saleResource => pipe(
    toJS,
    copyResourcesToRoot,
    map(pipe(
        whenNotSale(setSaleKey(saleResource.get('key'))),
        prefixUri,
        createQueryString,
        stripSubResources,
        overResources(Set),
    )),
    indexBy(prop('key')),
    fromJS,
)(saleResource);

const saveResources = (state, action) => state.mergeDeep(
    flattenResources(action.response.get('data'))
).sortBy(get('sortId'));

const actionHandlers = {
    [ActionsType.REQUEST_PRODUCT_SUCCESS]: saveResources,
    [ActionsType.REQUEST_CATALOG_SUCCESS]: saveResources,
    [ActionsType.REQUEST_PACKAGE_SUCCESS]: saveResources,
    [ActionsType.REQUEST_RESOURCE_SUCCESS]: saveResources,
};

export default createReducer(initialState, actionHandlers);
