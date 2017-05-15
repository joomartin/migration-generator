const expect = require('chai').expect;

const TypeMapperPhinx = require('../../../database/type-mapper/phinx');

let mapper = new TypeMapperPhinx;

describe('TypeMapperPhinx', () => {
    describe('#map()', () => {
        it('should map varchar to string', () => {
            let type = mapper.map('VARCHAR');
            expect(type).to.be.equal('string');

            type = mapper.map('varchar');
            expect(type).to.be.equal('string');
        });

        it('should map int to integer', () => {
            let type = mapper.map('INT');
            expect(type).to.be.equal('integer');

            type = mapper.map('int');
            expect(type).to.be.equal('integer');
        });

        it('should map bigint to biginteger', () => {
            let type = mapper.map('BIGINT');
            expect(type).to.be.equal('biginteger');

            type = mapper.map('bigint');
            expect(type).to.be.equal('biginteger');
        });

        it('should map tinyint to integer', () => {
            let type = mapper.map('TINYINT');
            expect(type).to.be.equal('integer');

            type = mapper.map('tinyint');
            expect(type).to.be.equal('integer');
        });

        it('should map decimal to decimal', () => {
            let type = mapper.map('DECIMAL');
            expect(type).to.be.equal('decimal');

            type = mapper.map('decimal');
            expect(type).to.be.equal('decimal');
        });
    });
});