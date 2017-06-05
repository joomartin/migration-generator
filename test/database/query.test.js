const expect = require('chai').expect;
const _ = require('lodash');

const query = require('../../database/query');
const queryProcess = require('../../business/query-process');
const TableContent = require('../../database/stream/table-content');
const utils = require('../../utils/utils');
const queryProcessFactory = require('../../business/query-process-factory');
const strUtils = require('../../utils/str');

describe('Query', () => {
    describe('#getTables()', () => {
        it('should query database for tables', (done) => {
            const config = {
                excludedTables: ['migrations'],
                database: 'test'
            };
            const connection = {
                query(queryString, callback) {

                    expect(queryString).to.be.equal('SHOW FULL TABLES IN `test` WHERE TABLE_TYPE NOT LIKE "VIEW"');

                    callback(undefined, [
                        { 'Tables_in_database': 'table1' },
                        { 'Tables_in_database': 'table2' },
                    ]);
                }
            }
            const filterFn = (tables) => {
                expect(tables).to.be.deep.equal([
                    { 'Tables_in_database': 'table1' },
                    { 'Tables_in_database': 'table2' },
                ]);

                return tables;
            }
            const concatFn = (str) => {
                expect(true).to.be.true;

                return 'SHOW FULL TABLES IN `test` WHERE TABLE_TYPE NOT LIKE "VIEW"';
            }

            query.getTables(connection, config, filterFn, concatFn)
                .then(res => {
                    expect(res.length).to.be.equal(2);
                    expect(res[0]['Tables_in_database']).to.be.equal('table1');
                    expect(res[1]['Tables_in_database']).to.be.equal('table2');

                    done();
                })
                .catch(err => console.log(err));
        });
    });

    describe('#getColumns()', () => {
        it('should return all columns from a table', (done) => {
            const columnsMock = {
                columns: [
                    { Field: 'id', Key: 'PRI' }, { Field: 'name' }, { Field: 'id' },
                    { Field: 'is_done', Key: 'MUL' }, { Field: 'unique_field', Key: 'UNI' },
                ],
                indexes: [
                    { Field: 'name' }, { Field: 'id' }
                ]
            };
            const connection = {
                query(queryString, callback) {

                    expect(queryString).to.be.equal('SHOW FULL COLUMNS FROM `table`');

                    callback(undefined, columnsMock.columns);
                }
            };
            const seperateColumnsFn = (columns) => {
                expect(columns).to.be.deep.equal(columnsMock.columns);

                return columnsMock;
            };
            const concatFn = (str) => {
                expect(true).to.be.true;

                return 'SHOW FULL COLUMNS FROM `table`';
            };

            query.getColumns(connection, 'table', seperateColumnsFn, concatFn)
                .then(columns => {
                    expect(columns.columns.length).to.be.equal(5);
                    expect(columns.indexes.length).to.be.equal(2);
                    expect(columns).to.be.deep.equal(columnsMock);
                    
                    done();
                })
                .catch(err => (console.log(err)));
        });
    });

    describe('#getDependencies()', () => {
        it('should return all dependencies for a table', (done) => {
            const table = 'table1';
            const connection = {
                config: {
                    database: 'database'
                },
                query(queryString, callback) {
                    expect(queryString).to.be.equal('SHOW CREATE TABLE `table1`');
                    callback(undefined, [
                        {
                            'Create Table': 'CREATE TABLE todos'
                        }
                    ]);
                }
            }

            const mapDependenciesFn = (table, createTable) => {
                expect(table).to.be.equal('table1');
                expect(createTable).to.be.equal('CREATE TABLE todos');

                return createTable;
            }

            query.getDependencies(connection, 'table1', mapDependenciesFn)
                .then(dependencies => {
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
            };
            const sanitizeFn = (viewTables) => {
                expect(viewTables).to.be.deep.equal([
                    { 'VIEW_DEFINITION': "SELECT *, 'static' AS static_field FROM table1", 'DEFINER': 'root@localhost' },
                    { 'VIEW_DEFINITION': 'SELECT * FROM table2', 'DEFINER': 'root@localhost' },
                ]);

                return viewTables;
            };
            const concatFn = (str) => {
                expect(true).to.be.true;

                return "SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = 'test'";
            };

            query.getViewTables(connection, sanitizeFn, concatFn)
                .then(res => {
                    expect(res.length).to.be.equal(2);
                    expect(res).to.be.deep.equal([
                        { 'VIEW_DEFINITION': "SELECT *, 'static' AS static_field FROM table1", 'DEFINER': 'root@localhost' },
                        { 'VIEW_DEFINITION': 'SELECT * FROM table2', 'DEFINER': 'root@localhost' },
                    ]);

                    done();
                })
                .catch(err => console.log(err));
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
