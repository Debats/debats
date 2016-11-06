import { values, pipe, compose, map, dissoc } from 'ramda';
import { whenNotNil } from 'helpers/ramda-ext';
import { createSelector } from 'reselect';
import { enrichWithRelationships, getSubjects, getPublicFigures } from './entities';

const injectSubjects = enrichWithRelationships('subjects', 'subjects');

export const getPublicFiguresWithRelations = createSelector(
    getPublicFigures,
    getSubjects,
    (publicFigures, allSubjects) => whenNotNil(
        compose(
            values,
            map(pipe(
                // injectSubjects(allSubjects),
                dissoc('relationthips'),
            ))
        )
    )(publicFigures)
);
