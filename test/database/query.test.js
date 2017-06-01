const expect = require('chai').expect;
const _ = require('lodash');

const query = require('../../database/query');
const queryProcess = require('../../business/query-process');
const TableContent = require('../../database/stream/table-content');
const utils = require('../../utils/utils');
const queryProcessFactory = require('../../business/factory/query-process');

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

            query.getColumns(connection, table, queryProcess.seperateColumns, queryProcess.filterIndexes)
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
            let config = {
                database: 'database'
            };

            let connection = {
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

            query.getDependencies(connection, 'table1', config, queryProcess.mapDependencies, _)
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

            query.getProcedures(connection, queryProcess.normalizeProcedureDefinition, utils.escapeQuotes, _)
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

    xdescribe('#getTableData()', () => {
        it('it returns all table data', (done) => {
            let connectionMock = {};
            let config = {
                database: 'test'
            };
            let queryDependency = {
                tables: [
                    {
                        'Tables_in_test': 'todos'
                    }, {
                        'Tables_in_test': 'categories'
                    }
                ],
                hasTable(table) {
                    return this.tables
                        .map(t => t['Tables_in_test'])
                        .some(tn => tn === table);
                },
                getTables(connection, config, filterCallback) {
                    expect(true).to.be.true;

                    return new Promise((resolve, reject) => {
                        resolve(this.tables);
                    });
                },
                getColumns(connection, table, filterCallback) {
                    expect(connection).to.be.equal(connectionMock);
                    expect(this.hasTable(table)).to.be.true;

                    return new Promise((resolve, reject) => {
                        let data = {
                            indexes: [
                                {
                                    'Field': 'category_id',
                                    'Type': 'int(11) unsigned',
                                    'Collation': null,
                                    'Null': 'YES',
                                    'Key': 'MUL',
                                    'Default': null,
                                    'Extra': '',
                                    'Privileges': 'select,insert,update,references',
                                    'Comment': ''
                                }
                            ],
                            columns: [
                                {
                                    'Field': 'title',
                                    'Type': 'varchar(255)',
                                    'Collation': null,
                                    'Null': 'YES',
                                    'Key': 'NO',
                                    'Default': null,
                                    'Extra': '',
                                    'Privileges': 'select,insert,update,references',
                                    'Comment': ''
                                },
                                {
                                    'Field': 'category_id',
                                    'Type': 'int(11) unsigned',
                                    'Collation': null,
                                    'Null': 'YES',
                                    'Key': 'MUL',
                                    'Default': null,
                                    'Extra': '',
                                    'Privileges': 'select,insert,update,references',
                                    'Comment': ''
                                }
                            ]
                        };

                        resolve(data);
                    });
                },
                getDependencies(connection, table, config) {
                    expect(connection).to.be.equal(connectionMock);
                    expect(this.hasTable(table)).to.be.true;

                    return new Promise((resolve, reject) => {
                        let data = [{
                            sourceTable: 'todos',
                            sourceColumn: 'category_id',
                            referencedTable: 'categories',
                            referencedColumn: 'id',
                            updateRule: 'NO ACTION',
                            deleteRule: 'SET NULL'
                        }];

                        resolve(data);
                    });
                },
                getContent(connection, table) {
                    expect(connection).to.be.equal(connectionMock);
                    expect(this.hasTable(table)).to.be.true;

                    return new Promise((resolve, reject) => {
                        let data = [
                            {
                                title: 'Todo #1',
                                category_id: null
                            }, {
                                title: 'Todo #2',
                                category_id: null
                            }
                        ];

                        resolve(data);
                    });
                }
            };

            query.getTableData(connectionMock, queryDependency, config)
                .then(res => {
                    expect(res[0].table).to.be.equal('todos');
                    expect(res[0].indexes.length).to.be.equal(1);
                    expect(res[0].columns.length).to.be.equal(2);

                    expect(res[0].indexes[0].Field).to.be.equal('category_id');
                    expect(res[0].columns[0].Field).to.be.equal('title');

                    expect(res[0].dependencies.length).to.be.equal(1);
                    expect(res[0].dependencies[0].referencedTable).to.be.equal('categories');
                    expect(res[0].dependencies[0].referencedColumn).to.be.equal('id');

                    expect(res[0].content.length).to.be.equal(2);
                    expect(res[0].content[0].title).to.be.equal('Todo #1');
                    expect(res[0].content[1].title).to.be.equal('Todo #2');

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
});
