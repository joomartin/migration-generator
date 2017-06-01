/**
 * @param {Array} tables - List of tables. Raw mysql results
 * @param {Object} config - App config
 * @return {Array} - Filtered tables
 */
const filterExcluededTables = (tables, config) => tables.filter(t => !config.excludedTables.includes(t[`Tables_in_${config.database}`]));

/**
 * @param {Array} viewTables - Raw view tables queried from database
 * @param {Function} replaceDatabaseNameFn - A callback that replaces source database name from view definition
 * @param {Function} escapeQuotesFn - A callback that escape quotes
 * @param {Object} _ - lodash
 * @return {Array} - Sanitized view tables
 */
const sanitizeViewTables = (viewTables, replaceDatabaseNameFn, escapeQuotesFn, database, _) =>
    viewTables.map(vt => {
        let viewTable = _.clone(vt);
        viewTable.VIEW_DEFINITION = replaceDatabaseNameFn(
            database, escapeQuotesFn(vt.VIEW_DEFINITION));

        return viewTable;
    });

/**
 * @param {string} value - Searched value in content to replace
 * @param {string} content - Content to search value in
 * @return {string}
 */
const replaceDatabaseInContent = (database, content) => content.replace(new RegExp('`' + database + '`.', 'g'), '');

/**
 * @param {Array} columns - Collection of table column objects
 * @param {Function} filterIndexesFn - A callback that filter out index columns
 * @return {Object}
 */
const seperateColumns = (columns, filterIndexesFn) => ({
    indexes: filterIndexesFn(columns),
    columns: columns
});

/**
 * @param {Array} columns - Raw mysql columns
 * @return {Array} 
 */
const filterIndexes = (columns) => columns.filter(c => c.Key === 'MUL' || c.Key === 'UNI');

/**
 * @param {Array} rows - raw mysql content
 * @param {Function} escapeFn - A callback that escapes quotes
 * @return {Array}
 */
const escapeRows = (rows, escapeFn) => {
    let escapedRows = [];
    rows.forEach(r => {
        let escapedRow = [];
        for (key in r) {
            escapedRow[key] = r[key];
            if (typeof r[key] === 'string') {
                escapedRow[key] = escapeFn(r[key]);
            }
        }

        escapedRows.push(escapedRow);
    });

    return escapedRows;
}

/**
 * @param {Array} dependencies - Foreign keys from a table (raw mysql query result)
 * @param {Object} _ - lodash
 * @return {Array}
 */
const mapDependencies = (dependencies, _) =>
    _.uniqBy(dependencies.map(r => {
        return {
            sourceTable: r['TABLE_NAME'],
            sourceColumn: r['COLUMN_NAME'],
            referencedTable: r['REFERENCED_TABLE_NAME'],
            referencedColumn: r['REFERENCED_COLUMN_NAME'],
            updateRule: r['UPDATE_RULE'],
            deleteRule: r['DELETE_RULE']
        };
    }), 'sourceColumn');

/**
 * @param {string} type - Procedure or function
 * @param {Object} definition - Definition
 * @param {Function} escapeFn - A callback that escapes quotes
 * @return {Object}
 */
const normalizeProcedureDefinition = (type, definition, escapeFn, _) => {
    const typeUpperFirst = _.upperFirst(type.toLowerCase());

    return {
        type,
        name: definition[typeUpperFirst],
        definition: escapeFn(definition[`Create ${typeUpperFirst}`])
    };
}

/**
 * @param {string} database - Name of database
 * @param {Array} triggers - List of triggers in raw format
 * @param {Function} escapeFn - Callback that escape quotes
 * @param {Object} _ - lodash
 * @return {Object}
 */
const mapTriggers = (database, triggers, escapeFn, _) => {
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

module.exports = {
    filterExcluededTables, sanitizeViewTables, replaceDatabaseInContent, seperateColumns, filterIndexes,
    escapeRows, mapDependencies, normalizeProcedureDefinition, mapTriggers
}