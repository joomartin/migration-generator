const utils = require('../../utils/utils');
const { compose, split, nth, head, isEmpty, prop, equals, or, contains, toUpper, toLower, cond, end, not, identity, and, is, assoc, propOr, useWith, propEq, F, T, ifElse, evolve } = require('ramda');

/**
 * @param field Array
 */
function ColumnInfo(field) {
    this.field = field;
}

ColumnInfo.prototype.mapType = function (nativeType) {
    return nativeType;
}

ColumnInfo.prototype.mapTypeOptions = function (typeOptions, type) {
    return typeOptions;
}

const mapTypeOptions = (typeOptions, type) => typeOptions;

ColumnInfo.prototype.mapOptions = function (options) {
    return options;
}

ColumnInfo.prototype.isTypeOf = function (actual, expected) {
    return actual.includes(expected.toUpperCase()) || actual.includes(expected.toLowerCase());
}

const isTypeOf = (expected, actual) =>
    useWith(contains, [toLower, toLower])(expected, actual);

ColumnInfo.prototype.isUnsigned = function (type) {
    return type.includes('unsigned') || type.includes('UNSIGNED');
}

const isUnsigned = compose(contains('unsigned'), toLower);

/**
 * @return bool
 */
ColumnInfo.prototype.isPrimaryKey = function () {
    return this.field['Key'] === 'PRI';
}

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

const getTypeOptions = (type, precision, scale, length, unsigned) => {
    const parts = type.split('(');
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

const getType = (field) => {
    const type = prop('Type', field);

    const parts = type.split('(');      
    let precision = null;
    let scale = null;
    let length = null;
    
    let options = {
        length: null, scale: null, precision: null
    };

    if (isTypeOf('decimal', type)) {
        const splitted = compose(split(','), nth(1))(parts);
        // options = evolve({
        //     precision: parseIntFromArray(head, splitted),
        //     scale: parseIntFromArray(nth(1), splitted)
        // }, options);
        precision = parseIntFromArray(head, splitted);
        scale = parseIntFromArray(nth(1), splitted);
    } else if (nth(1, parts)) {
        // options = evolve({
        //     length: parseIntFromArray(nth(1), parts) 
        // });
        length = parseIntFromArray(nth(1), parts);
    }

    options = assoc('unsigned', isUnsigned(type), options);

    return {
        name: parts[0].trim(),
        options: mapTypeOptions(
            getTypeOptions(field['Type'], precision, scale, length, isUnsigned(type)), type)
    };
}

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

const isNull = compose(not, propEq('Null', 'NO'));
const isAutoIncrement = propEq('Extra', 'auto_increment');

const getOptions = field => {
    let options = {};

    options = assoc('null', isNull(field), options);
    options = assoc('default', propOr(undefined, 'Default', field), options); 

    if (field['Extra'] === 'auto_increment') {
        options.auto_increment = true;
    }

    return options;
}


module.exports = {
    ColumnInfo, normalizeLength, parseIntFromArray, isTypeOf, isUnsigned, isPrimaryKey, getOptions, getType
};