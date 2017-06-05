const _ = require('lodash');

const ColumnInfo = require('./column-info');

function ColumnInfoPhinx(field) {
    ColumnInfo.call(this, field);
}

ColumnInfoPhinx.prototype = Object.create(ColumnInfo.prototype);

ColumnInfoPhinx.prototype.mapTypeOptions = function (typeOptions, type) {
    let original = _.clone(typeOptions);
    let mapped = _.clone(typeOptions);

    if (this.isTypeOf(type, 'int') || this.isTypeOf(type, 'decimal')) {
        mapped.signed = !original.unsigned;
        delete mapped.unsigned;
    }

    if (this.isTypeOf(type, 'longtext')) {
        mapped.length = 'MysqlAdapter::TEXT_LONG';
    }

    return mapped;
}

ColumnInfoPhinx.prototype.mapOptions = function (options) {
    let original = _.clone(options);
    let mapped = _.clone(options);

    if (original.auto_increment) {
        mapped.identity = original.auto_increment;
        delete mapped.auto_increment;
    }

    return mapped;
}

/**
 * @param type String
 */
ColumnInfoPhinx.prototype.mapType = function (nativeType) {
    return TYPES
        .filter(t => t.native === nativeType.toLowerCase())
        .map(t => t.mapped)
        .shift() || nativeType.toLowerCase();
}

const TYPES = [
    { native: 'varchar', mapped: 'string' },
    { native: 'int', mapped: 'integer' },
    { native: 'bigint', mapped: 'biginteger' },
    { native: 'tinyint', mapped: 'integer' },
    { native: 'decimal', mapped: 'decimal' },
    { native: 'longtext', mapped: 'text' }
];

module.exports = ColumnInfoPhinx;