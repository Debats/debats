import { values, pipe, map, compose, dissoc } from 'ramda';
import { createSelector } from 'reselect';
import { whenNotNil } from 'helpers/ramda-ext';
import {
    enrichWithRelationship, getPublicFigures, getPositions, getSubjects, getStatements,
} from './entities';

const injectPublicFigure = enrichWithRelationship('publicFigure', 'public-figure');
const injectPosition = enrichWithRelationship('position', 'position');
const injectSubject = enrichWithRelationship('subject', 'subject');

export const getLatestStatements = createSelector(
    getStatements,
    getPublicFigures,
    getPositions,
    getSubjects,
    (allStatements, allPublicFigures, allPositions, allSubjects) => whenNotNil(
        compose(
            values,
            map(pipe(
                injectPublicFigure(allPublicFigures),
                injectSubject(allSubjects),
                injectPosition(allPositions),
                dissoc('relationthips'),
            ))
        )
    )(allStatements)
);
