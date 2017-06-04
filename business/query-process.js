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
 * @param {Array} columns - Raw mysql columns
 * @return {Array} 
 */
const filterIndexes = (columns) => columns.filter(c => c.Key === 'MUL' || c.Key === 'UNI');

/**
 * @param {Function} escapeFn - A callback that escapes quotes
 * @param {Array} rows - raw mysql content
 * @return {Array}
 */
const escapeRows = (escapeFn, rows) => {
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
 * @param {Object} _ - lodash
 * @param {Array} dependencies - Foreign keys from a table (raw mysql query result)
 * @return {Array}
 */
const mapDependencies = (_, dependencies) =>
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
 * @param {Object} _ - lodash
 * @param {Function} escapeFn - A callback that escapes quotes
 * @param {string} type - Procedure or function
 * @param {Object} definition - Definition
 * @return {Object}
 */
const normalizeProcedureDefinition = (_, escapeFn, type, definition) => {
    const typeUpperFirst = _.upperFirst(type.toLowerCase());

    return {
        type,
        name: definition[typeUpperFirst],
        definition: escapeFn(definition[`Create ${typeUpperFirst}`])
    };
}

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

const getDependenciesFromCreateTable = (table, createTable) => {
    const foreignKeys = substringFrom(createTable, 'CONSTRAINT');
    const arr = foreignKeys.split('CONSTRAINT').filter(item => item.trim());

    arr.forEach(line => {
        const tmp = substringFrom(line, 'FOREIGN KEY');
        const rest = _.trimEnd(tmp.slice(0, tmp.indexOf(') ENGINE')));
        const regex = /`[a-z_]*`/g;

        if (rest) {
            console.log('--------');
            console.log(rest);
            let columns = regex.exec(rest);
            let matches = [];

            while (columns !== null) {
                matches.push(columns[0]);
                columns = regex.exec(rest);
            }

            const rules = substringFrom(rest, 'ON DELETE');
            const deleteRule = rules.slice(0, rules.indexOf('ON UPDATE'));
            const updateRule = _.trimEnd(rules.slice(rules.indexOf('ON UPDATE')), ',');

            console.log(_.trim(matches[0], '()`'));
            const obj = {
                sourceTable: table,
                sourceColumn: _.trim(matches[0], '()`'),
                referencedTable: _.trim(matches[1], '()`'),
                referencedColumn: _.trim(matches[2], '()`'),
                updateRule: _.trim(updateRule.slice(9)),
                deleteRule: _.trim(deleteRule.slice(9)) 
            };

            console.log(obj);
        }
    }); 
}

module.exports = {
    filterExcluededTables, sanitizeViewTables, replaceDatabaseInContent, seperateColumns, filterIndexes,
    escapeRows, mapDependencies, normalizeProcedureDefinition, mapTriggers
}