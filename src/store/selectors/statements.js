import { createSelector } from 'reselect';

export const getStatements = state => state.api.statements ? state.api.statements.data : null;

