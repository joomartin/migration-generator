const _ = require('lodash');

const ColumnInfo = require('./column-info');

function ColumnInfoPhinx(field) {
    ColumnInfo.call(this, field);
}

ColumnInfoPhinx.prototype = Object.create(ColumnInfo.prototype);

ColumnInfoPhinx.prototype.mapTypeOptions = function (typeOptions, type) {
    let original = _.clone(typeOptions);
    let mapped = _.clone(typeOptions);

    if (original.unsigned !== undefined) {
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

module.exports = ColumnInfoPhinx;