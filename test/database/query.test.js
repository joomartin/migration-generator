const expect = require('chai').expect;

const query = require('../../database/query');

describe('Query', () => {
    describe('#getTables()', () => {
        it('should query database for tables', (done) => {
            let config = {
                excludedTables: ['migrations']
            };

            let connection = {
                query(queryString, callback) {

                    expect(queryString).to.be.equal('SHOW TABLES');

                    callback(undefined, [
                        { 'Tables_in_database': 'table1' },
                        { 'Tables_in_database': 'table2' },
                    ]);
                }
            }

            query.getTables(connection, config, query.isTableIncluded)
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

            query.getColumns(connection, table, query.filterIndexes)
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

            query.getDependencies(connection, 'table1', config)
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

    describe('#isTableIncluded', () => {
        it('should return true if a table is not excluded by config', () => {
            let config = {
                excludedTables: ['migrations'],
                database: 'test'
            };

            let filter = query.isTableIncluded({Tables_in_test: 'migrations'}, config);
            expect(filter).to.be.false;

            filter = query.isTableIncluded({Tables_in_test: 'test1'}, config);
            expect(filter).to.be.true;
        });
    });

    describe('#getContent()', () => {
        it('should execute SELECT * query for a table', (done) => {
            let connection = {
                query(queryString, callback) {
                    expect(queryString).to.be.equal('SELECT * FROM todos')

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

            let escapeJsonContent = (content) => {
                expect(content).to.be.string;

                return content;
            }

            query.getContent(connection, 'todos', escapeJsonContent)
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
                config: { database: 'database' },
                query(queryString, callback) {

                    expect(queryString.includes('FROM INFORMATION_SCHEMA.ROUTINES')).to.be.true;
                    expect(queryString.includes(`WHERE ROUTINE_SCHEMA = 'database'`)).to.be.true;

                    callback(undefined, [
                        {
                            SPECIFIC_NAME: 'proc1',
                            ROUTINE_TYPE: 'PROCEDURE',
                            ROUTINE_DEFINITION: 'BEGIN DECLARE END'
                        }, {
                            SPECIFIC_NAME: 'func1',
                            ROUTINE_TYPE: 'FUNCTION',
                            ROUTINE_DEFINITION: 'BEGIN DECLARE END'
                        },
                    ]);
                }
            }

            query.getProcedures(connection, query.convertProceduresToObjects)
                .then(res => {
                    expect(Object.keys(res).length).to.be.equal(2);

                    expect(res['proc1'].type).to.be.equal('PROCEDURE');
                    expect(res['func1'].type).to.be.equal('FUNCTION');

                    done();
                })
                .catch(err => console.log(err));
        });
    });

    describe('#getTableData()', () => {
        it('happy path', () => {
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
                    expect(res.todos.indexes.length).to.be.equal(1);
                    expect(res.todos.columns.length).to.be.equal(2);

                    expect(res.todos.indexes[0].Field).to.be.equal('category_id');
                    expect(res.todos.columns[0].Field).to.be.equal('title');

                    expect(res.todos.dependencies.length).to.be.equal(1);
                    expect(res.todos.dependencies[0].referencedTable).to.be.equal('categories');
                    expect(res.todos.dependencies[0].referencedColumn).to.be.equal('id');

                    expect(res.todos.content.length).to.be.equal(2);
                    expect(res.todos.content[0].title).to.be.equal('Todo #1');
                    expect(res.todos.content[1].title).to.be.equal('Todo #2');
                })
                .catch(err => console.log(err));
        });
    });

    describe('#escapeJsonContent()', () => {
        it('should escape quotes', () => {
            let obj = {id: 1, name: "it has 'quotes'"};
            let escaped = query.escapeJsonContent(JSON.stringify(obj));

            let temp = "\\'quotes\\'";
            expect(escaped).to.be.equal(`{"id":1,"name":"it has ${temp}"}`);
        });
    });
});