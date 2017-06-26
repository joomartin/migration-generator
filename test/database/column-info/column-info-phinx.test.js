const { mapTypeOptions, mapOptions, mapType } = require('../../../database/column-info/column-info-phinx')
const expect = require('chai').expect;

describe('ColumnInfoPhinx', () => {
    describe('#mapOptions()', () => {
        it('should map auto increment to identity', () => {
            const mapped = mapOptions({ auto_increment: true });

            expect(mapped.identity).to.be.true;
            expect(mapped.auto_increment).to.be.undefined;
        });

        it('should return back the given object, when no special mapping needed', () => {
            const options = { default: '' };
            const mapped = mapOptions(options);

            expect(mapped).to.be.deep.eq(options);            
        });
    })

    describe('#mapTypeOptions()', () => {
        it('should map longtext to longtext with specific length options', () => {
            const mapped = mapTypeOptions({}, 'longtext');
            expect(mapped.length).to.be.equal('MysqlAdapter::TEXT_LONG');
        });

        it('should map unsigned to signed', () => {
            const mapped = mapTypeOptions({ unsigned: true }, 'int (11) UNSIGNED');
            expect(mapped.signed).to.be.false;
            expect(mapped.unsigned).to.be.undefined;
        });

        it('should return back the given object, when no special mapping needed', () => {
            const options = { default: '' };
            const mapped = mapTypeOptions(options, 'varchar (100)');
            expect(mapped).to.be.deep.eq(options);
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