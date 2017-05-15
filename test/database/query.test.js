const expect = require('chai').expect;

const query = require('../../database/query');

describe('Query', () =>  {
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
});