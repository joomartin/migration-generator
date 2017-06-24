const { mapTypeOptions, mapOptions, mapType } = require('../../../database/column-info/column-info-phinx')
const expect = require('chai').expect;

describe('ColumnInfoPhinx', () => {
    describe('#mapOptions()', () => {
        it('should map auto increment to identity', () => {
            const options = {
                auto_increment: true
            };
            const mapped = mapOptions(options);

            expect(mapped.identity).to.be.true;
            expect(mapped.auto_increment).to.be.undefined;
        });
    })

    describe('#mapTypeOptions()', () => {
        it('should map longtext to longtext with specific length options', () => {
            const type = 'longtext';
            const mapped = mapTypeOptions({}, type);

            expect(mapped.length).to.be.equal('MysqlAdapter::TEXT_LONG');
        });
    });

    describe('#mapType()', () => {
        it('should map native mysql types to phinx specific types', () => {
            expect(mapType('varchar')).to.be.equal('string');
            expect(mapType('int')).to.be.equal('integer');
            expect(mapType('bigint')).to.be.equal('biginteger');
            expect(mapType('tinyint')).to.be.equal('integer');
            expect(mapType('decimal')).to.be.equal('decimal');
            expect(mapType('longtext')).to.be.equal('text');
        });
    });
});