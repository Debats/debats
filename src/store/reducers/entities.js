import actionsType from '../actions_types';
import { map, compose, prop, merge, assoc, not, isNil, pipe, when } from 'ramda';
const initialState = {};
import { indexAndGroup } from 'api/jsonApiParser';

const isNotNil = compose(not, isNil);

export const indexAndGroupMainData = compose(
    indexAndGroup,
    map(assoc('fetched', true)),
    prop('data')
);

const indexAndGroupIncludedData = pipe(
    prop('included'),
    when(
        isNotNil,
        compose(
            indexAndGroup,
            map(assoc('fetched', true)),
        )
    ),
);

const saveData = data => compose(
    merge(indexAndGroupIncludedData(data)),
    indexAndGroupMainData,
)(data);

export const entitiesReducer = (state = initialState, action) => {
    switch (action.type) {
        case actionsType.ENTITY_READ: return merge(state, saveData(action.data));
        default: return state;
    }
};
