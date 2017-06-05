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

    describe('#concat()', () => {
        it('should concat any number of strings', () => {
            const hello = 'Hello';
            const world = ' world.';
            const functional = ' Functional programming is great!'; 

            expect(strUtils.concat(hello, world, functional)).to.be.equal('Hello world. Functional programming is great!');
        });
    });
});