const ColumnInfoPhinx = require('../../../database/column-info/column-info-phinx')
const expect = require('chai').expect;

describe('#getType', () => {
    it('should return int type with length and signed', () => {
        // INT (10) UNSIGNED
        let type = (new ColumnInfoPhinx({
            Type: 'INT (11) UNSIGNED'
        })).getType();

        expect(type.name).to.be.equal('INT');
        expect(type.options.length).to.be.equal(11);
        expect(type.options.signed).to.be.false;
    });

    it('should return decimal type with precision and scale', () => {
        // DECIMAL (10, 2)
        let type = (new ColumnInfoPhinx({
            Type: 'DECIMAL (10, 2)'
        })).getType();

        expect(type.name).to.be.equal('DECIMAL');
        expect(type.options.precision).to.be.equal(10);
        expect(type.options.scale).to.be.equal(2);
        expect(type.options.signed).to.be.true;
    });

    it('should return decimal type with precision, scale and unsigned', () => {
        // DECIMAL (10, 2) UNSIGNED
        let type = (new ColumnInfoPhinx({
            Type: 'DECIMAL (12, 4) UNSIGNED'
        })).getType();

        expect(type.name).to.be.equal('DECIMAL');
        expect(type.options.precision).to.be.equal(12);
        expect(type.options.scale).to.be.equal(4);
        expect(type.options.signed).to.be.false;
    });

    it('should return int type with length', () => {
            // INT (10)
            let type = (new ColumnInfoPhinx({
                Type: 'INT (10)'
            })).getType();

            expect(type.name).to.be.equal('INT');
            expect(type.options.length).to.be.equal(10);
            expect(type.options.signed).to.be.true;
        });
});