const ColumnInfo = require('../../database/column-info');
const expect = require('chai').expect;


describe('ColumnInfo', () => {
    describe('#isPrimaryKey', () => {
        it('should return true if a field is primary key', () => {
            let info = new ColumnInfo({
                Key: 'PRI'
            });

            expect(info.isPrimaryKey()).to.be.true;
        });

        it('should return false if a field is not primary key', () => {
            let info = new ColumnInfo({
                Key: 'MUML'
            });

            expect(info.isPrimaryKey()).to.be.false;
        });
    });
});