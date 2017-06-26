const expect = require('chai').expect;

const TableContent = require('../../../database/stream/table-content');

describe('TableContent', () => {
    describe('#read()', () => {
        it('should select the content of a table', done => {
            const dataMock = [
                { id: 1, name: 'first' }, { id: 2, name: 'second' },
            ];
            const connection = {
                query(queryString, callback) {
                    expect(queryString).to.be.equal('SELECT * FROM `table`');

                    callback(null, dataMock);
                }
            };

            const content$ = new TableContent(connection, 'table', { max: 1, highWaterMark: Math.pow(2, 16) });
            let data = [];

            content$.on('error', (err) => {
                throw err;
            });

            content$.on('data', (chunk) => {
                data = data.concat(chunk);
            });

            content$.on('end', () => {
                expect(data).to.be.deep.equal(dataMock);

                done();
            });
        });

        it('should emit error event if error in query', done => {
            const dataMock = [
                { id: 1, name: 'first' }, { id: 2, name: 'second' },
            ];
            const connection = {
                query(queryString, callback) {
                    expect(queryString).to.be.equal('SELECT * FROM `table`');

                    callback('ERROR');
                }
            };

            const content$ = new TableContent(connection, 'table', { max: 1, highWaterMark: Math.pow(2, 16) });

            content$.on('error', (err) => {
                expect(err).to.be.equal('ERROR');
                done();
            });

            content$.on('data', (chunk) => {
                expect(false).to.be.true;
            });

            content$.on('end', () => {
                expect(false).to.be.true;
            });
        });
    });
});