const expect = require('chai').expect;
const strUtils = require('../../utils/str');

describe('Str', () => {
    describe('#substringFrom()', () => {
        it('should return substring from a given string in a given string', () => {
            const str = 'This is a test string';
            const fromTest = strUtils.substringFrom('test', str);

            expect(fromTest).to.be.equal('test string');
        });
    });

    describe('#concat()', () => {
        it('should concat any number of strings', () => {
            const hello = 'Hello';
            const world = ' world.';
            const functional = ' Functional programming is great!';

            expect(strUtils.concat(hello, world, functional)).to.be.equal('Hello world. Functional programming is great!');
        });
    });

    describe('#escapeQuotes()', () => {
        it('should return a string with escaped quotes', () => {
            const quoted = "it has 'some' quotes";
            const standard = 'Test standard string';

            expect(strUtils.escapeQuotes(quoted)).to.be.equal("it has \\'some\\' quotes");
            expect(strUtils.escapeQuotes(standard)).to.be.equal('Test standard string');
        });
    });
});