import actionsTypes from '../actions_types';

export const onLastStatementsAccess = () => ({
    type: actionsTypes.ENTITY_ACCESS,
    accessType: 'list',
    entityType: 'statements',
    listType: 'latest',
});

export const onHottestSubjectsAccess = () => ({
    type: actionsTypes.ENTITY_ACCESS,
    accessType: 'list',
    entityType: 'subjects',
    listType: 'hottest',
});

export const onPublicFiguresListAccess = () => ({
    type: actionsTypes.ENTITY_ACCESS,
    accessType: 'list',
    entityType: 'publicFigures',
    listType: 'all',
});
