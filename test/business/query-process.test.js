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

    describe('#sanitizeViewTables()', () => {
        it('should sanitize given view tables', () => {
            const viewTables = [
                { VIEW_DEFINITION: 'view table #1' }, { VIEW_DEFINITION: 'view table #2' }
            ];
            const definitions = viewTables.map(vt => vt.VIEW_DEFINITION);
            const replaceDatabaseNameFn = (database, content) => {
                expect(database).to.be.equal('test-database');
                return content;
            };
            const escapeQuotesFn = (content) => {
                expect(definitions).include(content);
                return content;
            };

            const database = 'test-database';
            const _ = {
                clone(obj) {
                    expect(viewTables).include(obj);
                    return obj;
                }
            }

            const sanitized = queryProcess.sanitizeViewTables(
                viewTables, replaceDatabaseNameFn, escapeQuotesFn, database, _);

            expect(sanitized.length).to.be.equal(viewTables.length);
        });
    });

    describe('#replaceDatabaseInContent()', () => {
        it('should return the given content, without the given database name', () => {
            const content = 'SELECT * FROM `test-database`.`test-table`';
            const database = 'test-database';

            const replaced = queryProcess.replaceDatabaseInContent(database, content);
            expect(replaced).to.be.equal('SELECT * FROM `test-table`');
        });
    });

    describe('#seperateColumns()', () => {
        it('should return the an array with seperated indexes and columns keys', () => {
            const columns = [
                { Field: 'id' }, { Field: 'name' }
            ];
            const indexFilterFn = (columns) => columns;

            const seperated = queryProcess.seperateColumns(columns, indexFilterFn);

            expect(seperated.columns.length).to.be.equal(2);
            expect(seperated.indexes.length).to.be.equal(2);

            expect(seperated.columns).to.be.deep.equal(columns);
            expect(seperated.indexes).to.be.deep.equal(columns);
            
        });
    });

    describe('#filterIndexes()', () => {
        it('should return all indexes from an array of columns', () => {
            const columns = [
                { Field: 'id', Key: 'PRI' }, { Field: 'name' }, 
                { Field: 'user_id', Key: 'MUL' }, { Field: 'serial', Key: 'UNI' }
            ];

            const indexes = queryProcess.filterIndexes(columns);

            expect(indexes.length).to.be.equal(2);
            expect(indexes).to.be.deep.equal([
                { Field: 'user_id', Key: 'MUL' }, { Field: 'serial', Key: 'UNI' }
            ]);
        });
    });
});