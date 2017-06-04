const expect = require('chai').expect;
const strUtils = require('../../utils/str');

describe('Str', () => {
    describe('#substringFrom()', () => {
        it('should return substring from a given string in a given string', () => {
            const str = 'This is a test string';
            const fromTest = strUtils.substringFrom(str, 'test');

            expect(fromTest).to.be.equal('test string');
        });
    });
});