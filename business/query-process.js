const _ = require('lodash');
const { curry, reject, contains, __, map, prop, clone, filter, either, propEq, forEach, is, identity, ifElse, compose, toLower, has, assoc, append, gt, trim, split, always, length, keys, slice, indexOf, useWith, tap, flatten } = require('ramda');
const { Maybe } = require('ramda-fantasy');
const strUtils = require('../utils/str');
const utils = require('../utils/utils');

/**
 * @param {Object} config - App config
 * @param {Array} tables - List of tables. Raw mysql results
 * @return {Array} - Filtered tables
 */
const filterExcluededTables = curry((config, tables) =>
    reject(
        contains(__, config.excludedTables)
    )(tables));

/**
 * @param {Object} config  
 * @param {Array} tables 
 * @return {Array}
 */
const mapTables = curry((config, tables) =>
    map(prop(`Tables_in_${config.database}`))(tables));

/**
 * @param {string} database - Database name
 * @param {Array} viewTables - Raw view tables queried from database
 * @return {Array} - Sanitized view tables
 */
const sanitizeViewTables = curry((database, viewTables) =>
    viewTables.map(vt => {
        let viewTable = clone(vt);
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
    filter(either(propEq('Key', 'MUL'), propEq('Key', 'UNI')));

/**
 * @param {Array} rows - raw mysql content
 * @return {Array}
 */
const escapeRows = (rows) =>
    map(r => {
        let escapedRow = {};
        forEach(k =>
            escapedRow[k] = ifElse(is(String), strUtils.escapeQuotes, identity)(r[k])
        )(keys(r));

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
    name: procedure.definition[compose(strUtils.toUpperFirst, toLower)(procedure.type)],
    definition: strUtils.escapeQuotes(procedure.definition[`Create ${strUtils.toUpperFirst(procedure.type.toLowerCase())}`])
});

/**
 * @param {Object} _ - lodash
 * @param {string} database - Name of database
 * @param {Array} triggers - List of triggers in raw format
 * @return {Object}
 */
const mapTriggers = curry((database, triggers) => {
    let mapped = {};
    triggers.forEach(t => {
        if (!has(t.Table, mapped)) {
            mapped = assoc(t.Table, [], mapped);
        }

        mapped[t.Table] = append({
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
 * @return {Array}
 */
const getForeignKeys1 =
    ifElse(
        contains('CONSTRAINT'),
        compose(
            map(trim),
            map(fk => fk.slice(0, fk.indexOf(') ENGINE'))),
            map(strUtils.substringFrom('FOREIGN KEY')),
            filter(strUtils.hasLength),
            split('CONSTRAINT'),
            strUtils.substringFrom('CONSTRAINT'),
        ),
        always([])
    );
    
const getForeignKeys = createTable =>
    Maybe(contains('CONSTRAINT', createTable) ? createTable : null)
        .map(strUtils.substringFrom('CONSTRAINT'))
        .map(split('CONSTRAINT'))
        .map(filter(strUtils.hasLength))
        .map(map(strUtils.substringFrom('FOREIGN KEY')))
        .map(map(fk => fk.slice(0, fk.indexOf(') ENGINE'))))
        .map(map(trim))
        .getOrElse([]);

/**
 * @param {String} table 
 * @param {String} createTable 
 * @return {Array}
 */
const parseDependencies = (table, createTable) => 
    getForeignKeys(createTable).map(fk => {
        const regex = /`[a-z_]*`/g;
        let matches = regex.exec(fk);
        let data = [];

        while (matches !== null) {
            data.push(matches[0]);
            matches = regex.exec(fk);
        }

        const deleteRule = fk.slice(fk.indexOf('ON DELETE'), fk.indexOf('ON UPDATE')).slice(9);
        const updateRule = compose(
            slice(9, Infinity), slice(__, Infinity, fk), indexOf('ON UPDATE')
        )(fk);

        return {
            sourceTable: table,
            sourceColumn: _.trim(data[0], '()`'),
            referencedTable: _.trim(data[1], '()`'),
            referencedColumn: _.trim(data[2], '()`'),
            updateRule: _.trim(updateRule, ' ,'),
            deleteRule: _.trim(deleteRule, ' ,')
        };
    });

module.exports = {
    filterExcluededTables, sanitizeViewTables, replaceDatabaseInContent, filterIndexes,
    escapeRows, normalizeProcedureDefinition, mapTriggers, parseDependencies,
    mapTables, getForeignKeys 
}