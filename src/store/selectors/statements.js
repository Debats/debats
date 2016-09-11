import { values, pipe, map, compose, dissoc } from 'ramda';
import { createSelector } from 'reselect';
import { whenNotNil } from 'helpers/ramda-ext';
import { enrichWithRelationship } from './entities';
import { getPublicFigures } from './publicFigures';
import { getPositions } from './positions';
import { getSubjects } from './subjects';

export const getStatements = state => state.entities.statements || null;

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
