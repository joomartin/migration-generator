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
        it('should call filtering function to columns and return a seperated array by columns and indexes', () => {
            const columns = [
                { Field: 'id' }, { Field: 'name' }
            ];
            const indexFilterFn = (columnsToBeFiltered) => {
                expect(columnsToBeFiltered).to.be.deep.equal(columns);
                return columnsToBeFiltered;
            };

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

    describe('#escapeRows()', () => {
        it('should foreach rows and escape string content', () => {
            const rows = [
                { id: 1, name: 'Item #1', user_id: 12 }, { id: 2, name: 'Item #2', user_id: 5 },
            ];

            const escapeFn = (content) =>  {
                expect(['Item #1', 'Item #2'].some(i => i === content)).to.be.true;
                expect(typeof content).to.be.equal('string');

                return content;
            }

            const escaped = queryProcess.escapeRows(rows, escapeFn);

            expect(escaped.length).to.be.equal(2);
        });
    });

    describe('#mapDependencies()', () => {
        it('should return a unique mapped array', () => {
            const dependencies = [
                {
                    TABLE_NAME: 'todos',
                    COLUMN_NAME: 'user_id',
                    REFERENCED_TABLE_NAME: 'users',
                    REFERENCED_COLUMN_NAME: 'id',
                    UPDATE_RULE: 'CASCADE',
                    DELETE_RULE: 'SET NULL'
                }
            ];

            const _ = {
                uniqBy(arr, key) {
                    expect(key).to.be.equal('sourceColumn');
                    return arr;
                }
            };

            const mapped = queryProcess.mapDependencies(dependencies, _);
            expect(mapped).to.be.deep.equal([
                {
                    sourceTable: 'todos',
                    sourceColumn: 'user_id',
                    referencedTable: 'users',
                    referencedColumn: 'id',
                    updateRule: 'CASCADE',
                    deleteRule: 'SET NULL'
                }
            ]);
        });
    });

    describe('#normalizeProcedureDefinition()', () => {
        it('should call escape function, and returns a mapped object', () => {
            const definition = {
                'Procedure': 'Procedure_Name',
                'Create Procedure': 'Procedure body'
            };
            const escapeFn = (content) => {
                expect(content).to.be.equal('Procedure body');
                return content;
            };
            const _ = {
                upperFirst(text) {
                    expect(text).to.be.equal('procedure');
                    return 'Procedure';
                }
            };

            const normalizedProcedureDefinition = queryProcess.normalizeProcedureDefinition('PROCEDURE', definition, escapeFn, _);

        });
    });

    describe('#normalizeProcedureDefinition()', () => {
        it('should call escape function, and returns a mapped object', () => {
            const triggers = [
                {
                    Trigger: 'trigger1', Event: 'INSERT', Timing: 'AFTER',
                    Statement: 'SET @foo = 1', Definer: 'root@localhost', Table: 'todos'
                }
            ];
            const escapeFn = (content) => {
                expect(content).to.be.equal('SET @foo = 1');
                return content;
            };
            const _ = {
                has() {
                    return false;
                },
                set(arr, key, val) {
                    arr[key] = val;
                }
            };

            const mappedTriggers = queryProcess.mapTriggers('database', triggers, escapeFn, _);
            expect(mappedTriggers.todos).to.be.deep.equal([
                {
                    name: 'trigger1',
                    event: 'INSERT',
                    timing: 'AFTER',
                    statement: 'SET @foo = 1',
                    definer: 'root@localhost',
                    table: 'todos',
                    database: 'database'
                }
            ]);
        });
    });
});