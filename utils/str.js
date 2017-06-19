const { compose, join, over, lensIndex, gt, length, trim, toUpper, toLower, map, split, curry, __ } = require('ramda');

/**
 * @param {string} src 
 * @param {string} str 
 * @return {string}
 */
const substringFrom = curry((str, src) => src.substring(src.indexOf(str)));

/**
 * @param {string} content - Any string
 * @return {string}
 */
const escapeQuotes = content => content.replace(/'/g, "\\'");

const transformFirstChar = curry((transformFn, str) =>
    compose(
        join(''),
        over(lensIndex(0), transformFn)
    )(str));

const toUpperFirst = transformFirstChar(toUpper);
const toLowerFirst = transformFirstChar(toLower);

/**
 * @return {boolean}
 */
const hasLength =
    compose(gt(__, 0), length, trim);

/**
 * @return {String}
 */
const camelCase = 
    compose(
        toLowerFirst,
        join(''),
        map(toUpperFirst), 
        split(/[-_| ]/g)
    );

/**
 * @param {Array} values 
 * @return {string}
 */
const concat = (...values) => values.reduce((carry, current) => carry + current, '');

module.exports = {
    substringFrom, concat, escapeQuotes, toUpperFirst, camelCase, toLowerFirst, hasLength
}