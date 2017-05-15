const TypeMapper = require('./type-mapper');

function TypeMapperPhinx() {
}

TypeMapperPhinx.prototype = Object.create(TypeMapper.prototype);

/**
 * @param type String
 */
TypeMapperPhinx.prototype.map = function (nativeType) {
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
    { native: 'decimal', mapped: 'decimal' }
];

module.exports = TypeMapperPhinx;