const R = require('ramda');
const { Either, Maybe } = require('ramda-fantasy');
const { Left, Right } = Either;
const strUtils = require('../utils/str');

/**
 * @param {Array} tables - List of tables. Raw mysql results
 * @param {Object} config - App config
 * @return {Array} - Filtered tables
 */
const filterExcluededTables = (tables, config) => tables.filter(t => !config.excludedTables.includes(t[`Tables_in_${config.database}`]));

/**
 * @param {Object} _ - lodash
 * @param {string} database - Database name
 * @param {Function} replaceDatabaseNameFn - A callback that replaces source database name from view definition
 * @param {Function} escapeQuotesFn - A callback that escape quotes
 * @param {Array} viewTables - Raw view tables queried from database
 * @return {Array} - Sanitized view tables
 */
const sanitizeViewTables = (_, database, replaceDatabaseNameFn, escapeQuotesFn, viewTables) =>
    viewTables.map(vt => {
        let viewTable = _.clone(vt);
        viewTable.VIEW_DEFINITION = replaceDatabaseNameFn(
            database, escapeQuotesFn(vt.VIEW_DEFINITION));

        return viewTable;
    });

/**
 * @param {string} database - Database name. Searched value in content to replace
 * @param {string} content - Content to search value in
 * @return {string}
 */
const replaceDatabaseInContent = (database, content) => content.replace(new RegExp('`' + database + '`.', 'g'), '');

/**
 * @param {Function} filterIndexesFn - A callback that filter out index columns
 * @param {Array} columns - Collection of table column objects
 * @return {Object}
 */
const seperateColumns = (filterIndexesFn, columns) => ({
    indexes: filterIndexesFn(columns),
    columns: columns
});

/**
 * @return {Array} 
 */
const filterIndexes =
    R.filter(R.either(R.propEq('Key', 'MUL'), R.propEq('Key', 'UNI')));

/**
 * @param {Function} escapeFn - A callback that escapes quotes
 * @param {Array} rows - raw mysql content
 * @return {Object}
 */
const escapeRows = (escapeFn, rows) => 
    R.map(r => {
        let escapedRow = {};
        R.forEach(k =>
            escapedRow[k] = R.ifElse(R.is(String), escapeFn, R.identity)(r[k])
        )(R.keys(r));

        return escapedRow;
    })(rows);
    
/**
 * @param {Object} _ - lodash
 * @param {Array} dependencies - Foreign keys from a table (raw mysql query result)
 * @return {Array}
 */
const mapDependencies = (_, dependencies) =>
    _.uniqBy(dependencies.map(r => (
        {
            sourceTable: r['TABLE_NAME'],
            sourceColumn: r['COLUMN_NAME'],
            referencedTable: r['REFERENCED_TABLE_NAME'],
            referencedColumn: r['REFERENCED_COLUMN_NAME'],
            updateRule: r['UPDATE_RULE'],
            deleteRule: r['DELETE_RULE']
        })), 'sourceColumn');

/**
 * @param {Object} _ - lodash
 * @param {Function} escapeFn - A callback that escapes quotes
 * @param {string} type - Procedure or function
 * @param {Object} definition - Definition
 * @return {Object}
 */
const normalizeProcedureDefinition = (_, escapeFn, type, definition) => ({
    type,
    name: definition[_.upperFirst(type.toLowerCase())],
    definition: escapeFn(definition[`Create ${_.upperFirst(type.toLowerCase())}`])
})

/**
 * @param {Object} _ - lodash
 * @param {Function} escapeFn - Callback that escape quotes
 * @param {string} database - Name of database
 * @param {Array} triggers - List of triggers in raw format
 * @return {Object}
 */
const mapTriggers = (_, escapeFn, database, triggers) => {
    let mapped = {};
    triggers.forEach(t => {
        if (!_.has(mapped, t.Table)) {
            _.set(mapped, t.Table, []);
        }

        mapped[t.Table].push({
            name: t.Trigger,
            event: t.Event,
            timing: t.Timing,
            statement: escapeFn(t.Statement),
            definer: t.Definer,
            table: t.Table,
            database: database
        });
    });

    return mapped;
}

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
            R.map(strUtils.substringFromCurry('FOREIGN KEY')),
            R.filter(hasLength),
            R.split('CONSTRAINT'),
            strUtils.substringFromCurry('CONSTRAINT'),
        ),
        R.always([])
    );

const parseDependencies = (_, substringFromFn, table, createTable) => {
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
}

/**
 * @param {Array} tables 
 * @param {Object} config 
 */
const mapTables = (tables, config) => tables.map(t => t[`Tables_in_${config.database}`]);

module.exports = {
    filterExcluededTables, sanitizeViewTables, replaceDatabaseInContent, seperateColumns, filterIndexes,
    escapeRows, mapDependencies, normalizeProcedureDefinition, mapTriggers, parseDependencies,
    mapTables, getForeignKeys
}