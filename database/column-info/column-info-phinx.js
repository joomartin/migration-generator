const { compose, map, filter, ifElse, head, equals, prop, toLower, clone, always, assoc, dissoc, not } = require('ramda');

const { isTypeOf } = require('./column-info');

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

const mapOptions = options => {
    let mapped = clone(options);

    if (prop('auto_increment', options)) {
        mapped = assoc('identity', prop('auto_increment', options), mapped);
        mapped = dissoc('auto_increment', mapped);
    }

    return mapped;
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
    mapTypeOptions, mapOptions, mapType
};