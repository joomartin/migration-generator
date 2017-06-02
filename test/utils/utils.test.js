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
});