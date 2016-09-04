import actionsTypes from '../actions_types';

export const onLastStatementsAccess = () => ({
    type: actionsTypes.ENTITY_ACCESS,
    accessType: 'list',
    entityType: 'statements',
    listType: 'latest',
});

export const onHotestSubjectsAccess = () => ({
    type: actionsTypes.ENTITY_ACCESS,
    accessType: 'list',
    entityType: 'subjects',
    listType: 'hotest',
});
