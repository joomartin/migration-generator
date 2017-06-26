const { assoc } = require('ramda');

const ColumnInfoPhinx = require('./column-info-phinx');
const ColumnInfo = require('./column-info');
const assert = require('assert');

const columnInfoFactory = config => {
    let obj = {};
    obj = ColumnInfo;

    switch (config.migrationLib) {
        case 'phinx':
            obj = assoc('getType', ColumnInfo.getType(ColumnInfoPhinx.mapTypeOptions), obj);
            obj = assoc('getOptions', ColumnInfo.getOptions(ColumnInfoPhinx.mapOptions), obj);
            obj = assoc('mapType', ColumnInfoPhinx.mapType, obj);
            break;
        default:
            obj = assoc('getType', ColumnInfo.getType(ColumnInfo.mapTypeOptions), obj);
            obj = assoc('getOptions', ColumnInfo.getOptions(ColumnInfo.mapOptions), obj);
            break;
    }

    assert.ok(obj);
    assert.ok(obj.getType);
    assert.ok(obj.getOptions);
    assert.ok(obj.mapType);

    return obj;
}

module.exports = columnInfoFactory;