const expect = require('chai').expect;
const _ = require('lodash');

const query = require('../../database/query');
const queryProcess = require('../../business/query-process');
const TableContent = require('../../database/stream/table-content');
const utils = require('../../utils/utils');
const queryProcessFactory = require('../../business/query-process-factory');

describe('Query', () => {
    describe('#getTables()', () => {
        it('should query database for tables', (done) => {
            let config = {
                excludedTables: ['migrations'],
                database: 'test'
            };

            let connection = {
                query(queryString, callback) {

                    expect(queryString).to.be.equal('SHOW FULL TABLES IN `test` WHERE TABLE_TYPE NOT LIKE "VIEW"');

                    callback(undefined, [
                        { 'Tables_in_database': 'table1' },
                        { 'Tables_in_database': 'table2' },
                    ]);
                }
            }

            query.getTables(connection, config, queryProcess.filterExcluededTables)
                .then(res => {
                    expect(res.length).to.be.equal(2)
                    done();
                })
                .catch(err => console.log(err));
        });
    });

    describe('#getColumns()', () => {
        it('should return all columns from a table', (done) => {
            let table = 'table';
            let connection = {
                query(queryString, callback) {

                    expect(queryString).to.be.equal(`SHOW FULL COLUMNS FROM ${table}`);

                    callback(undefined, [
                        { Field: 'id', Key: 'PRI' }, { Field: 'name' }, { Field: 'id' },
                        { Field: 'is_done', Key: 'MUL' }, { Field: 'unique_field', Key: 'UNI' },
                    ]);
                }
            }

            const seperateColumnsFn = queryProcessFactory.seperateColumnsFactory(queryProcess.filterIndexes);
            query.getColumns(connection, table, seperateColumnsFn)
                .then(columns => {
                    expect(columns.columns.length).to.be.equal(5);
                    expect(columns.indexes.length).to.be.equal(2);
                    done();
                })
                .catch(err => (console.log(err)));
        });
    });

    describe('#getDependencies()', () => {
        it('should return all dependencies for a table', (done) => {
            const connection = {
                config: {
                    database: 'database'
                },
                query(queryString, callback) {
                    callback(undefined, [
                        {
                            TABLE_NAME: 'table1',
                            COLUMN_NAME: 'column1',
                            REFERENCED_TABLE_NAME: 'table2',
                            REFERENCED_COLUMN_NAME: 'column2',
                            UPDATE_RULE: 'CASCADE',
                            DELETE_RULE: 'SET NULL'
                        },
                    ]);
                }
            }

            const mapDependenciesFn = queryProcessFactory.mapDependenciesFactory(_);

            query.getDependencies(connection, 'table1', mapDependenciesFn)
                .then(dependencies => {
                    expect(dependencies.length).to.be.equal(1);

                    expect(dependencies[0].sourceTable).to.be.equal('table1');
                    expect(dependencies[0].sourceColumn).to.be.equal('column1');
                    expect(dependencies[0].referencedTable).to.be.equal('table2');
                    expect(dependencies[0].referencedColumn).to.be.equal('column2');
                    expect(dependencies[0].updateRule).to.be.equal('CASCADE');
                    expect(dependencies[0].deleteRule).to.be.equal('SET NULL');

                    done();
                })
                .catch(err => (console.log(err)));
        });
    });

    describe('#getContent()', () => {
        it('should execute SELECT * query for a table', (done) => {
            let connection = {
                query(queryString, callback) {
                    expect(queryString).to.be.equal('SELECT * FROM `todos`')

                    callback(undefined, [
                        {
                            id: 1,
                            title: 'Todo #1',
                            description: 'Important'
                        }, {
                            id: 2,
                            title: 'Todo #2',
                            description: 'Not tmportant'
                        },
                    ]);
                }
            }

            let escapeQuotes = (content) => {
                expect(content).to.be.string;

                return content;
            }

            const content$ = new TableContent(connection, 'todos', { max: 1, highWaterMark: Math.pow(2, 16) });

            query.getContent(content$, escapeQuotes, queryProcess.escapeRows)
                .then(res => {
                    expect(res.length).to.be.equal(2);

                    expect(res[0].id).to.be.equal(1);
                    expect(res[0].title).to.be.equal('Todo #1');

                    expect(res[1].id).to.be.equal(2);
                    expect(res[1].title).to.be.equal('Todo #2');

                    done();
                })
                .catch(err => console.log(err));
        });
    });

    describe('#getProcedures()', () => {
        it('should get all procedures and functions for a database', (done) => {
            let connection = {
                count: 0,
                config: { database: 'database' },
                query(queryString, callback) {
                    this.count++;
                    if (this.count === 1) {
                        expect(queryString.includes("FROM INFORMATION_SCHEMA.ROUTINES")).to.be.true;
                        expect(queryString.includes("WHERE ROUTINE_SCHEMA = 'database'")).to.be.true;

                        callback(undefined, [
                            {
                                SPECIFIC_NAME: 'proc1',
                                ROUTINE_TYPE: 'PROCEDURE',
                                ROUTINE_DEFINITION: 'SOME PROCEDURE',
                                DEFINER: 'root@localhost'
                            }, {
                                SPECIFIC_NAME: 'func1',
                                ROUTINE_TYPE: 'FUNCTION',
                                ROUTINE_DEFINITION: 'SOME FUNCTION',
                                DEFINER: 'root@localhost'
                            },
                        ]);
                    } else {
                        expect(queryString.includes("SHOW CREATE")).to.be.true;

                        if (queryString.includes('FUNCTION')) {
                            callback(undefined, [
                                {
                                    'Function': 'func1',
                                    'Create Function': 'SOME FUNCTION'
                                }
                            ]);
                        } else {
                            callback(undefined, [
                                {
                                    'Procedure': 'proc1',
                                    'Create Procedure': 'SOME PROCEDURE'
                                }
                            ]);
                        }
                    }
                }
            }

            let escapeCallback = (s) => s;
            const normalizeProcedureDefinitionFn = queryProcessFactory.normalizeProcedureDefinitionFactory(
                _, utils.escapeQuotes);

            query.getProcedures(connection, query.getProceduresMeta, query.getProcedureDefinition, normalizeProcedureDefinitionFn)
                .then(res => {
                    expect(res.length).to.be.equal(2);

                    expect(res[0].type).to.be.equal('PROCEDURE');
                    expect(res[0].definition).to.be.equal('SOME PROCEDURE');
                    expect(res[0].name).to.be.equal('proc1');

                    expect(res[1].type).to.be.equal('FUNCTION');
                    expect(res[1].definition).to.be.equal('SOME FUNCTION');
                    expect(res[1].name).to.be.equal('func1');

                    done();
                })
                .catch(err => console.log(err));
        });
    });

    describe('#escapeQuotes()', () => {
        it('should escape quotes', () => {
            let obj = { id: 1, name: "it has 'quotes'" };
            let escaped = utils.escapeQuotes(JSON.stringify(obj));

            let temp = "\\'quotes\\'";
            expect(escaped).to.be.equal(`{"id":1,"name":"it has ${temp}"}`);
        });
    });

    describe('#getViewTables()', () => {
        it('should query database for view tables', (done) => {
            const connection = {
                config: { database: 'test' },
                query(queryString, callback) {

                    expect(queryString).to.be.equal("SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = 'test'");

                    callback(undefined, [
                        { 'VIEW_DEFINITION': "SELECT *, 'static' AS static_field FROM table1", 'DEFINER': 'root@localhost' },
                        { 'VIEW_DEFINITION': 'SELECT * FROM table2', 'DEFINER': 'root@localhost' },
                    ]);
                }
            }

            const sanitizeFn = queryProcessFactory.sanitizeViewTablesFactory(
                _, 'test', queryProcess.replaceDatabaseInContent, utils.escapeQuotes);

            query.getViewTables(connection, sanitizeFn)
                .then(res => {
                    expect(res.length).to.be.equal(2);
                    expect(res[0]['VIEW_DEFINITION']).includes("\\'static\\'");
                    done();
                })
                .catch(err => console.log(err));
        });
    });

    describe('#getViewTables', () => {
        it('should query view tables and call sanitize function', (done) => {
            const views = [
                { name: 'view1' }
            ];
            const connection = {
                config: {
                    database: 'database'
                },
                query(queryString, callback) {
                    expect(queryString).to.be.equal("SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = 'database'");
                    callback(null, views);
                }
            };
            const sanitizeFn = (viewsRaw) => {
                expect(viewsRaw).to.be.equal(views);
                return viewsRaw;
            }

            query.getViewTables(connection, sanitizeFn)
                .then(viewTables => {
                    expect(viewTables).to.be.equal(views)
                    done();
                });
        });
    });

    describe('#getTriggers', () => {
        it('should query view tables and call sanitize function', (done) => {
            const triggersMock = [
                { name: 'trigger1' }
            ];
            const connection = {
                config: {
                    database: 'database'
                },
                query(queryString, callback) {
                    expect(queryString).to.be.equal("SHOW TRIGGERS FROM `database`");
                    callback(null, triggersMock);
                }
            };
            const mapFn = (database, triggersRaw) => {
                expect(triggersRaw).to.be.equal(triggersMock);
                return triggersRaw;
            }

            query.getTriggers(connection, mapFn)
                .then(triggers => {
                    expect(triggers).to.be.equal(triggersMock)
                    done();
                });
        });
    });

    describe('#getTableData', () => {
        it('should call all function that produces table data', (done) => {
            const tablesMock = [
                { table: 'table1' }, { table: 'table2' }
            ];
            const config = {
                database: 'database'
            };
            const connection = {
            };
            const queryMock = {
                getTables() {
                    return new Promise((resolve, reject) => {
                        expect(true).to.be.true;
                        resolve(tablesMock);
                    });
                },
                getColumns() {
                    return new Promise((resolve, reject) => {
                        expect(true).to.be.true;
                        resolve({
                            columns: [
                                { Field: 'column1' }, { Field: 'column2' }
                            ],
                            idnexes: [
                                { Field: 'index1' }
                            ],
                        });
                    });
                },
                getDependencies() {
                    return new Promise((resolve, reject) => {
                        expect(true).to.be.true;
                        resolve([{ sourceTable: 'table1', sourceColumn: 'col1' }, { sourceTable: 'table1', sourceColumn: 'col2' }]);
                    });
                },
                getContent() {
                    return new Promise((resolve, reject) => {
                        expect(true).to.be.true;
                        resolve([{ id: 1, name: 'First' }, { id: 2, name: 'Second' }]);
                    });
                }
            };

            query.getTableData(connection, queryMock, config, queryProcess, utils)
                .then(() => {
                    done()
                })
                .catch(console.log);
        });
    });
});
