import types from '../actions_types';

export const onAddStatementValidate = newStatement => ({
    type: types.ADD_STATEMENT_VALIDATE,
    payload: { ...newStatement },
});
