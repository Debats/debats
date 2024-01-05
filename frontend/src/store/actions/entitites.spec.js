import { onLastStatementsAccess, onPublicFiguresListAccess, onHottestSubjectsAccess } from './entities';

describe('store', () => {
    describe('actions', () => {
        describe('entities', () => {
            test('onLastStatementsAccess', () => {
                const action = onLastStatementsAccess();

                expect(action).toEqual({
                    type: 'ENTITY_ACCESS',
                    accessType: 'list',
                    entityType: 'statements',
                    listType: 'latest',
                })
            })
        });
    });
});
