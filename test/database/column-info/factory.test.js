const expect = require('chai').expect;

const columnInfoFactory = require('../../../database/column-info/factory');

describe('ColumnInfo Factory', () => {
    it('should create default ColumnInfo', () => {
        const config = {
            migrationLib: 'not-supported'
        };
        const columnInfo = columnInfoFactory(config);

        expect(columnInfo.getType).to.be.not.empty;
        expect(columnInfo.getOptions).to.be.not.empty;
    });

    it('should create Phinx ColumnInfo', () => {
        const config = {
            migrationLib: 'phinx'
        };
        const columnInfo = columnInfoFactory(config);

        expect(columnInfo.getType).to.be.not.empty;
        expect(columnInfo.getOptions).to.be.not.empty;
    });
});