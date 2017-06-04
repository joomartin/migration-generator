const expect = require('chai').expect;
const strUtil = require('../../utils/str');

describe('Str', () => {
    describe('#substringFrom()', () => {
        it('should return substring from a given string in a given string', () => {
            const str = 'This is a test string';
            const fromTest = strUtil.substringFrom(str, 'test');

            expect(fromTest).to.be.equal('test string');
        });
    });
});