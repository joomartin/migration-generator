const { ColumnInfo, getType, getOptions } = require('./column-info');
const { ColumnInfoPhinx, mapTypeOptions, mapOptions } = require('./column-info-phinx');
const { assoc } = require('ramda');
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

const v2 = config => {
    let obj = {};
    switch (config.migrationLib) {
        case 'phinx': 
            obj = assoc('getType', getType(mapTypeOptions), obj);
            obj = assoc('getOptions', getOptions(mapOptions), obj);
            break;
        default: 
            columnInfo = new ColumnInfo(field);
            break;
    }
}

module.exports = columnInfoFactory;