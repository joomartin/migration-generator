const expect = require('chai').expect;

const utils = require('../../utils/utils');

describe('Utils', () => {
    describe('#escapeQuotes()', () => {
        it('should return a string with escaped quotes', () => {
            const quoted = "it has 'some' quotes";
            const standard = 'Test standard string';

            expect(utils.escapeQuotes(quoted)).to.be.equal("it has \\'some\\' quotes");
            expect(utils.escapeQuotes(standard)).to.be.equal('Test standard string');
        });
    });

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
});