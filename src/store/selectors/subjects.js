import { values, pipe, compose, map, dissoc } from 'ramda';
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
                dissoc('relationthips'),
            ))
        )
    )(homeSubjects)
);
