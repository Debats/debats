import { values, pipe } from 'ramda';

import { createSelector } from 'reselect';

export const getPositions = state => state.entities.positions;
