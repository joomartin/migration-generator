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

            query.getTables(connection, config)
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

    describe('#filterExcludedTables', () => {
        it('should filter out tables which are in config excluded tables', () => {
            let tablesRaw = [
                { 'Tables_in_database': 'table1' },
                { 'Tables_in_database': 'table2' },
                { 'Tables_in_database': 'migrations' },
            ];

            let config = {
                excludedTables: ['migrations'],
                database: 'database'
            };

            let filteredTables = query.filterExcludedTables(tablesRaw, config);

            expect(filteredTables.length).to.be.equal(2);

            let tables = filteredTables.map(t => t['Tables_in_database']);

            expect(tables).to.include('table1');
            expect(tables).to.include('table2');
            expect(tables).to.not.include('migrations');
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

            query.getContent(connection, 'todos')
                .then(res => {
                    expect(res.length).to.be.equal(2);

                    expect(res[0].id).to.be.equal(1);
                    expect(res[1].id).to.be.equal(2);

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

            query.getProcedures(connection, query.mapProcedures)
                .then(res => {
                    expect(Object.keys(res).length).to.be.equal(2);

                    expect(res['proc1'].type).to.be.equal('PROCEDURE');
                    expect(res['func1'].type).to.be.equal('FUNCTION');

                    done();
                })
                .catch(err => console.log(err));
        });
    });
});