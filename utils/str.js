const R = require('ramda');

/**
 * @param {string} src 
 * @param {string} str 
 * @return {string}
 */
const substringFrom = R.curry((str, src) => src.substring(src.indexOf(str)));

/**
 * @param {string} content - Any string
 * @return {string}
 */
const escapeQuotes = content => content.replace(/'/g, "\\'");

const transformFirstChar = R.curry((transformFn, str) =>
    R.compose(
        R.join(''),
        R.over(R.lensIndex(0), transformFn)
    )(str));

const toUpperFirst = transformFirstChar(R.toUpper);
const toLowerFirst = transformFirstChar(R.toLower);

const camelCase = 
    R.compose(
        toLowerFirst,
        R.join(''),
        R.map(toUpperFirst), 
        R.split(/[-_| ]/g)
    );

/**
 * @param {Array} values 
 * @return {string}
 */
const concat = (...values) => values.reduce((carry, current) => carry + current, '');

module.exports = {
    substringFrom, concat, escapeQuotes, toUpperFirst, camelCase, toLowerFirst
}