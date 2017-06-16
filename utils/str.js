const R = require('ramda');

/**
 * @param {string} src 
 * @param {string} str 
 * @return {string}
 */
const substringFrom = (src, str) => src.substring(src.indexOf(str));
const substringFromCurry = R.curry((str, src) => src.substring(src.indexOf(str)));

/**
 * @param {Array} values 
 * @return {string}
 */
const concat = (...values) => values.reduce((carry, current) => carry + current, '');

module.exports = {
    substringFrom, concat, substringFromCurry
}