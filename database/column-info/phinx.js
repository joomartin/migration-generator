const ColumnInfo = require('../column-info');

function ColumnInfoPhinx(field) {
    ColumnInfo.call(this, field);
}

ColumnInfoPhinx.prototype = Object.create(ColumnInfo.prototype);

/**
 * @param type String
 */
ColumnInfoPhinx.prototype.mapNativeType = function (type) {
    return TYPES
        .filter(t => t.native.includes(type))
        .map(t => t.mapped)
        .shift() || type.toLowerCase();
}

const TYPES = [
    { native: 'varchar', mapped: 'string' },
    { native: 'int', mapped: 'integer' },
    { native: 'bigint', mapped: 'biginteger' },
    { native: 'tinyint', mapped: 'integer' },
    { native: 'decimal', mapped: 'decimal' }
];

module.exports = ColumnInfoPhinx;