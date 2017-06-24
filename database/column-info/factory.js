const { ColumnInfo } = require('./column-info');
const { ColumnInfoPhinx } = require('./column-info-phinx');
const assert = require('assert');

const columnInfoFactory = (config, field) => {
    let columnInfo = false;
    switch (config.migrationLib) {
        case 'phinx': 
            columnInfo = new ColumnInfoPhinx(field);
            break;
        default: 
            columnInfo = new ColumnInfo(field);
            break;
    }

    assert.ok(columnInfo);
    return columnInfo;
}

module.exports = columnInfoFactory;