import { values, pipe } from 'ramda';

import { createSelector } from 'reselect';

export const getSubjects = state => state.entities.subjects;

export const getHomeSubjects = state => values(getSubjects(state));
