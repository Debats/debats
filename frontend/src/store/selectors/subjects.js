import { find, values, pipe, compose, map, dissoc, propEq } from 'ramda';
import { createSelector } from 'reselect';
import { whenNotNil } from 'helpers/ramda-ext';

import { enrichWithRelationships, getPublicFigures, getPositions, getSubjects } from './entities';

export const getHomeSubjects = state => values(getSubjects(state));

const injectRemarquablePublicFigures
    = enrichWithRelationships('remarquablePublicFigures', 'remarquable-public-figures');

const injectPositions = enrichWithRelationships('positions', 'positions');

export const getHomeSubjectsWithRelations = createSelector(
  getHomeSubjects,
  getPublicFigures,
  getPositions,
  (homeSubjects, allPublicFigures, allPositions) => whenNotNil(
    compose(
      values,
      map(pipe(
        injectRemarquablePublicFigures(allPublicFigures),
        injectPositions(allPositions),
        dissoc('relationships'),
            ))
        )
    )(homeSubjects)
);

export const getSubject = (state, props) => createSelector(
  getSubjects,
  getPositions,
  getPublicFigures,
  (allSubjects, allPositions, allPublicFigures) => pipe(
    find(propEq('id', props.subjectId)),
    injectRemarquablePublicFigures(allPublicFigures),
    injectPositions(allPositions),
    dissoc('relationthips'),
    )(allSubjects)
);
