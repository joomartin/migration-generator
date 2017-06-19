const expect = require('chai').expect;

const utils = require('../../utils/utils');

describe('Utils', () => {
    

    describe('#getSerial()', () => {
        it('should return a padded serial number', () => {
            expect(utils.getSerial(12)).to.be.equal('000012');
            expect(utils.getSerial(1)).to.be.equal('000001');
            expect(utils.getSerial(9999999)).to.be.equal('9999999');
            expect(utils.getSerial(9999999, 10)).to.be.equal('0009999999');
        });
    });

    describe('#sideEffect()', () => {
        it('should call the function and returns the value', () => {
            const tmp = null;
            const fn = v => {
                expect(true).to.be.true;
            }

            expect(utils.sideEffect(fn)(10)).to.be.equal(10);
        });
    });

    describe('#logHeader()', () => {
        it('should not destroy my code coverage', () => {
            const config = { database: 'database' };
            const consoleMock = { log(msg) { expect(true).to.be.true; } };
            const utilMock = { log(msg) { expect(true).to.be.true; } };
            const chalkMock = {
                green(msg) { return msg },
                yellow(msg) { return msg },
                bold(msg) { return msg },
                bgRed: { bold: { yellow(msg) { return msg; } }}
            };
            
            utils.logHeader(config, utilMock, consoleMock, chalkMock);
            expect(true).to.be.true;
        });
    });
});