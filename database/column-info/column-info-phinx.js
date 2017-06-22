const { compose, map, filter, ifElse, head, equals, prop, toLower, clone, always, assoc, dissoc, not } = require('ramda');

const { ColumnInfo, isTypeOf } = require('./column-info');

function ColumnInfoPhinx(field) {
    ColumnInfo.call(this, field);
}

ColumnInfoPhinx.prototype.isTypeOf = function (actual, expected) {
    return actual.includes(expected.toUpperCase()) || actual.includes(expected.toLowerCase());
}

ColumnInfoPhinx.prototype = Object.create(ColumnInfo.prototype);

ColumnInfoPhinx.prototype.mapTypeOptions = function (typeOptions, type) {
    let mapped = clone(typeOptions);

    if (this.isTypeOf(type, 'int') || this.isTypeOf(type, 'decimal')) {
        mapped.signed = !typeOptions.unsigned;
        delete mapped.unsigned;
    }

    if (this.isTypeOf(type, 'longtext')) {
        mapped.length = 'MysqlAdapter::TEXT_LONG';
    }

    return mapped;
}

const mapTypeOptions = (typeOptions, type) => {
    let mapped = clone(typeOptions);

    if (isTypeOf('int', type) || isTypeOf('decimal', type)) {
        mapped = assoc('signed', not(prop('unsigned', typeOptions)), mapped);
        mapped = dissoc('unsigned', mapped);
    }

    if (isTypeOf(type, 'longtext')) {
        mapped = assoc('length', 'MysqlAdapter::TEXT_LONG', mapped);
    }

    return mapped;
}

ColumnInfoPhinx.prototype.mapOptions = function (options) {
    let mapped = clone(options);

    if (options.auto_increment) {
        mapped.identity = options.auto_increment;
        delete mapped.auto_increment;
    }

    return mapped;
}

const mapOptions = options => {
    let mapped = clone(options);

    if (prop('auto_increment', options)) {
        mapped = assoc('identity', prop('auto_increment', options), mapped);
        mapped = dissoc('auto_increment', mapped);
        // mapped.identity = options.auto_increment;
        // delete mapped.auto_increment;
    }

    return mapped;
}


/**
 * @param type String
 */
ColumnInfoPhinx.prototype.mapType = function (nativeType) {
    return compose(
        ifElse(head, head, always(nativeType.toLowerCase())),
        map(prop('mapped')),
        filter(compose(
            equals(toLower(nativeType)),
            prop('native')
        ))
    )(TYPES);
}

const mapType = nativeType =>
    compose(
        ifElse(head, head, always(nativeType.toLowerCase())),
        map(prop('mapped')),
        filter(compose(
            equals(toLower(nativeType)),
            prop('native')
        ))
    )(TYPES);

const TYPES = [
    { native: 'varchar', mapped: 'string' },
    { native: 'int', mapped: 'integer' },
    { native: 'bigint', mapped: 'biginteger' },
    { native: 'tinyint', mapped: 'integer' },
    { native: 'decimal', mapped: 'decimal' },
    { native: 'longtext', mapped: 'text' }
];

module.exports = {
    ColumnInfoPhinx, mapTypeOptions, mapOptions, mapType
};