const expect = require('chai').expect;

const { ColumnInfo } = require('../../../database/column-info/column-info');
const ColumnInfoPhinx = require('../../../database/column-info/column-info-phinx');
const columnInfoFactory = require('../../../database/column-info/factory');

describe('ColumnInfo Factory', () => {
    it('should create default ColumnInfo', () => {
        let config = {
            migrationLib: 'not-supported'
        };
        let columnInfo = columnInfoFactory(config, { Type: 'int (10)', Field: 'id'});

        expect(columnInfo instanceof ColumnInfo).to.be.true;
    });

    it('should create Phinx ColumnInfo', () => {
        let config = {
            migrationLib: 'phinx'
        };
        let columnInfo = columnInfoFactory(config, { Type: 'int (10)', Field: 'id'});

        expect(columnInfo instanceof ColumnInfoPhinx).to.be.true;
    });
});