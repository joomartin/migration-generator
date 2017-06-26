const utils = require('../../utils/utils');
const { compose, split, nth, head, isEmpty, prop, equals, or, contains, toUpper, toLower, cond, end, not, identity, and, is, assoc, propOr, useWith, propEq, F, T, ifElse, evolve, always, curry, trim } = require('ramda');

// mapType :: String -> String
const mapType = identity;

// mapTypeOptions :: Object, String -> Object
const mapTypeOptions = (options, type) => options;

// mapOptions :: Object, String -> Object
const mapOptions = (options, type) => options;

// isTypeOf -> String -> (String) -> bool
const isTypeOf = curry((expected, actual) =>
    useWith(contains, [toLower, toLower])(expected, actual));

// isUnsigned :: String -> bool
const isUnsigned = compose(contains('unsigned'), toLower);

// isPrimaryKey :: Object -> bool
const isPrimaryKey = compose(equals('PRI'), toUpper, propOr('', 'Key'));

const normalizeLength =
    cond([
        [and(compose(not, isEmpty), compose(not, isNaN)), parseInt],
        [compose(not, isEmpty), identity]
    ]);

// parseIntFromArray :: (int, Array), Array -> int
const parseIntFromArray = (getter, arr) =>
    compose(parseInt, getter)(arr);

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
    normalizeLength, parseIntFromArray, isTypeOf, isUnsigned, isPrimaryKey, getOptions, getType, mapOptions, mapTypeOptions, mapType
};