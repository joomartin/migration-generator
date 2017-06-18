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

    describe('#camelCase', () => {
        it('should return camelCased version of a string', () => {
            expect(strUtils.camelCase('foo')).to.be.eq('foo');

            expect(strUtils.camelCase('table_name')).to.be.eq('tableName');
            expect(strUtils.camelCase('complicated_table_name_test')).to.be.eq('complicatedTableNameTest');

            expect(strUtils.camelCase('css-selector')).to.be.eq('cssSelector');
            expect(strUtils.camelCase('space seperated')).to.be.eq('spaceSeperated');
        });
    });

    describe('#toUpperFirst', () => {
        it('should return Uppercased version of a string', () => {
            expect(strUtils.toUpperFirst('foo')).to.be.eq('Foo');
            expect(strUtils.toUpperFirst('Foo')).to.be.eq('Foo');
            expect(strUtils.toUpperFirst(' foo')).to.be.eq(' foo');
            expect(strUtils.toUpperFirst('foo bar baz')).to.be.eq('Foo bar baz');
        });
    });

    describe('#toLowerFirst', () => {
        it('should return lowercased version of a string', () => {
            expect(strUtils.toLowerFirst('foo')).to.be.eq('foo');
            expect(strUtils.toLowerFirst('Foo')).to.be.eq('foo');
            expect(strUtils.toLowerFirst(' foo')).to.be.eq(' foo');
            expect(strUtils.toLowerFirst('Foo bar baz')).to.be.eq('foo bar baz');
        });
    });
});