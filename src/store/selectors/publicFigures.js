import { values, pipe } from 'ramda';

import { createSelector } from 'reselect';

export const getPublicFigures = state => state.entities['public-figures'];
