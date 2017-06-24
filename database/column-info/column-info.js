const utils = require('../../utils/utils');
const { compose, split, nth, head, isEmpty, prop, equals, or, contains, toUpper, toLower, cond, end, not, identity, and, is, assoc, propOr, useWith, propEq, F, T, ifElse, evolve, always, curry, trim } = require('ramda');

/**
 * @param field Array
 */
function ColumnInfo(field) {
    this.field = field;
}

ColumnInfo.prototype.mapType = function (nativeType) {
    return nativeType;
}

// mapType :: String -> String
const mapType = nativeType => nativeType;

ColumnInfo.prototype.mapTypeOptions = function (typeOptions, type) {
    return typeOptions;
}

// mapTypeOptions :: Object, String -> Object
const mapTypeOptions = (options, type) => options;

ColumnInfo.prototype.mapOptions = function (options) {
    return options;
}

// mapOptions :: Object, String -> Object
const mapOptions = (options, type) => options;

ColumnInfo.prototype.isTypeOf = function (actual, expected) {
    return actual.includes(expected.toUpperCase()) || actual.includes(expected.toLowerCase());
}

// isTypeOf -> String -> (String) -> bool
const isTypeOf = curry((expected, actual) =>
    useWith(contains, [toLower, toLower])(expected, actual));

ColumnInfo.prototype.isUnsigned = function (type) {
    return type.includes('unsigned') || type.includes('UNSIGNED');
}

// isUnsigned :: String -> bool
const isUnsigned = compose(contains('unsigned'), toLower);

/**
 * @return bool
 */
ColumnInfo.prototype.isPrimaryKey = function () {
    return this.field['Key'] === 'PRI';
}

// isPrimaryKey :: Object -> bool
const isPrimaryKey = compose(equals('PRI'), toUpper, propOr('', 'Key'));

ColumnInfo.prototype.getTypeOptions = function (type, precision, scale, length, unsigned) {
    const parts = this.field['Type'].split('(');
    let options = {};

    options = assoc('length', normalizeLength(length), options);

    utils.setKey(options, 'precision', precision, parseInt);
    utils.setKey(options, 'scale', scale, parseInt);
    utils.setKey(options, 'unsigned', unsigned, undefined, () => or(isTypeOf('decimal', type), isTypeOf('int', type)));

    return options;
}

const normalizeLength =
    cond([
        [and(compose(not, isEmpty), compose(not, isNaN)), parseInt],
        [compose(not, isEmpty), identity]
    ]);

// parseIntFromArray :: (int, Array), Array -> int
const parseIntFromArray = (getter, arr) =>
    compose(parseInt, getter)(arr);

/**
 * @return Object
 */
ColumnInfo.prototype.getType = function () {
    const type = this.field['Type'];
    const parts = type.split('(');  

    let length = null;
    let scale = null;
    let precision = null;

    if (isTypeOf('decimal', type)) {
        const splitted = compose(split(','), nth(1))(parts);
        precision = parseIntFromArray(head, splitted);
        scale = parseIntFromArray(nth(1), splitted);
    } else if (parts[1]) { 
        length = parseIntFromArray(nth(1), parts);
    } 

    return {
        name: parts[0].trim(),
        options: this.mapTypeOptions(
            this.getTypeOptions(this.field['Type'], precision, scale, length, isUnsigned(type)), type)
    };
}

/**
 * Visszaadja a mező típusát, és a típusra vonatkozó optionöket (precision, scale, length, unsigned)
 * @param {Object} field 
 */
const getType = curry((mapTypeOptionsFn, field) => {
    const type = prop('Type', field);
    const parts = split('(', type);
    
    let options = {};

    if (isTypeOf('decimal', type)) {
        const splitted = compose(split(','), nth(1))(parts);
        options = assoc('precision', parseIntFromArray(head, splitted), options);
        options = assoc('scale', parseIntFromArray(nth(1), splitted), options);
    } 
    
    if (nth(1, parts)) {
        options = assoc('length', normalizeLength(parseIntFromArray(nth(1), parts)), options);
    }

    if (isTypeOf('decimal', type) || isTypeOf('int', type)) {
        options = assoc('unsigned', isUnsigned(type), options);
    }

    return {
        name: compose(trim, head)(parts),
        options: mapTypeOptionsFn(options, type)
    };
});

/**
 * @return null | Object
 */
ColumnInfo.prototype.getOptions = function () {
    let options = {
        'null': true,
    };

    utils.setKey(options, 'null', false, undefined, () => this.field['Null'] === 'NO');
    utils.setKey(options, 'default', this.field['Default']);
    utils.setKey(options, 'auto_increment', true, undefined, () => this.field['Extra'] === 'auto_increment');

    return this.mapOptions(options);
}

// isNull :: Object -> bool
const isNull = compose(not, propEq('Null', 'NO'));

// isAutoIncrement :: Object -> bool
const isAutoIncrement = propEq('Extra', 'auto_increment');

/**
 * Visszaadja a mezőre vonatkozó optionöket (null, defualt, auto_increment)
 * @param {Object} field 
 */
const getOptions = curry((mapOptionsFn, field) => {
    let options = {};

    options = assoc('null', isNull(field), options);
    if (field['Default']) {
        options = assoc('default', prop('Default', field), options);         
    }

    if (isAutoIncrement(field)) {
        options = assoc('auto_increment', true, options);
    }

    return mapOptionsFn(options);
});

module.exports = {
    ColumnInfo, normalizeLength, parseIntFromArray, isTypeOf, isUnsigned, isPrimaryKey, getOptions, getType, mapOptions, mapTypeOptions, mapType
};