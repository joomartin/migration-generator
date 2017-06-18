const _ = require('lodash');
const R = require('ramda');
const { Either, Maybe } = require('ramda-fantasy');
const { Left, Right } = Either;
const strUtils = require('../utils/str');
const utils = require('../utils/utils');

/**
 * @param {Object} config - App config
 * @param {Array} tables - List of tables. Raw mysql results
 * @return {Array} - Filtered tables
 */
const filterExcluededTables = R.curry((config, tables) =>
    R.reject(
        R.contains(R.__, config.excludedTables)
    )(tables));

/**
 * @param {Object} config  
 * @param {Array} tables 
 * @return {Array}
 */
const mapTables = R.curry((config, tables) =>
    R.map(R.prop(`Tables_in_${config.database}`))(tables));

/**
 * @param {string} database - Database name
 * @param {Array} viewTables - Raw view tables queried from database
 * @return {Array} - Sanitized view tables
 */
const sanitizeViewTables = R.curry((database, viewTables) =>
    viewTables.map(vt => {
        let viewTable = R.clone(vt);
        viewTable.VIEW_DEFINITION = replaceDatabaseInContent(
            database, strUtils.escapeQuotes(vt.VIEW_DEFINITION));

        return viewTable;
    }));

/**
 * @param {string} database - Database name. Searched value in content to replace
 * @param {string} content - Content to search value in
 * @return {string}
 */
const replaceDatabaseInContent = (database, content) => content.replace(new RegExp('`' + database + '`.', 'g'), '');

/**
 * @return {Array} 
 */
const filterIndexes =
    R.filter(R.either(R.propEq('Key', 'MUL'), R.propEq('Key', 'UNI')));

/**
 * @param {Array} rows - raw mysql content
 * @return {Array}
 */
const escapeRows = (rows) =>
    R.map(r => {
        let escapedRow = {};
        R.forEach(k =>
            escapedRow[k] = R.ifElse(R.is(String), strUtils.escapeQuotes, R.identity)(r[k])
        )(R.keys(r));

        return escapedRow;
    })(rows);

/**
 * @param {Object} _ - lodash
 * @param {Function} escapeFn - A callback that escapes quotes
 * @param {string} type - Procedure or function
 * @param {Object} definition - Definition
 * @return {Object}
 */
const normalizeProcedureDefinition = (procedure) => ({
    type: procedure.type,
    name: procedure.definition[R.compose(strUtils.toUpperFirst, R.toLower)(procedure.type)],
    definition: strUtils.escapeQuotes(procedure.definition[`Create ${strUtils.toUpperFirst(procedure.type.toLowerCase())}`])
});

/**
 * @param {Object} _ - lodash
 * @param {string} database - Name of database
 * @param {Array} triggers - List of triggers in raw format
 * @return {Object}
 */
const mapTriggers = R.curry((database, triggers) => {
    let mapped = {};
    triggers.forEach(t => {
        if (!R.has(t.Table, mapped)) {
            mapped = R.assoc(t.Table, [], mapped);
        }

        mapped[t.Table] = R.append({
            name: t.Trigger,
            event: t.Event,
            timing: t.Timing,
            statement: strUtils.escapeQuotes(t.Statement),
            definer: t.Definer,
            table: t.Table,
            database: database
        }, mapped[t.Table]);
    });

    return mapped;
});

/**
 * @return {boolean}
 */
const hasLength =
    R.compose(R.gt(R.__, 0), R.length, R.trim);

/**
 * @return {Array}
 */
const getForeignKeys =
    R.ifElse(
        R.contains('CONSTRAINT'),
        R.compose(
            R.map(R.trim),
            R.map(fk => fk.slice(0, fk.indexOf(') ENGINE'))),
            R.map(strUtils.substringFrom('FOREIGN KEY')),
            R.filter(hasLength),
            R.split('CONSTRAINT'),
            strUtils.substringFrom('CONSTRAINT'),
        ),
        R.always([])
    );

/**
 * @param {String} table 
 * @param {String} createTable 
 * @return {Array}
 */
const parseDependencies = (table, createTable) => {
    const foreignKeys = getForeignKeys(createTable);

    return foreignKeys.map(fk => {
        const regex = /`[a-z_]*`/g;
        let matches = regex.exec(fk);
        let data = [];

        while (matches !== null) {
            data.push(matches[0]);
            matches = regex.exec(fk);
        }

        const deleteRule = fk.slice(fk.indexOf('ON DELETE'), fk.indexOf('ON UPDATE')).slice(9);
        const updateRule = fk.slice(fk.indexOf('ON UPDATE')).slice(9);

        return {
            sourceTable: table,
            sourceColumn: _.trim(data[0], '()`'),
            referencedTable: _.trim(data[1], '()`'),
            referencedColumn: _.trim(data[2], '()`'),
            updateRule: _.trim(updateRule, ' ,'),
            deleteRule: _.trim(deleteRule, ' ,')
        };
    });
};

module.exports = {
    filterExcluededTables, sanitizeViewTables, replaceDatabaseInContent, filterIndexes,
    escapeRows, normalizeProcedureDefinition, mapTriggers, parseDependencies,
    mapTables, getForeignKeys 
}