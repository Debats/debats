import { values, pipe, compose, map, dissoc } from 'ramda';
import { createSelector } from 'reselect';
import { whenNotNil } from 'helpers/ramda-ext';
import { enrichWithRelationships } from './entities';
import { getPublicFigures } from './publicFigures';
import { getPositions } from './positions';

export const getSubjects = state => state.entities.subjects;

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
