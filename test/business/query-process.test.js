const expect = require('chai').expect;
const queryProcess = require('../../business/query-process');

describe('QueryProcess', () => {
    describe('#filterExcluededTables', () => {
        it('should return filtered tables based on config excluded tables property', () => {
            const config = {
                excludedTables: ['migrations'],
                database: 'test'
            };
            const tables = [
                { 'Tables_in_test': 'migrations' }, { 'Tables_in_test': 'table1' }, { 'Tables_in_test': 'table2' }
            ];

            const filteredTables = queryProcess.filterExcluededTables(tables, config)
            expect(filteredTables.length).to.be.equal(2);
            expect(filteredTables).to.include({ 'Tables_in_test': 'table1' });
        });
    });
});