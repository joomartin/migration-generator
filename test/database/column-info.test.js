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

    describe('#getOptions', () => {
        it('should return column options as an object', () => {
            let info = new ColumnInfo({
                Null: 'NO',
                Default: 'Value',
                Key: 'UNI'
            });

            let options = info.getOptions();

            expect(options.null).to.be.false;
            expect(options.default).to.be.equal('Value');
            expect(options.unique).to.be.true;
        });

        it('should return column options as an object excluding non existing options', () => {
            let info = new ColumnInfo({
                Default: 'Value',
            });

            let options = info.getOptions();

            expect(options.null).to.be.undefined;
            expect(options.default).to.be.equal('Value');
            expect(options.unique).to.be.undefined;
        });

        it('should return null when column does not have options', () => {
            let info = new ColumnInfo({
                Type: 'INT (10)'
            });

            let options = info.getOptions();

            expect(options).to.be.null;
        });
    });
});