const _ = require('lodash');

const TableContent = require('./stream/table-content');

/**
 * @param connection Object
 * @param config Object
 * @param filterCallback Function
 * @return Promise
 */
const getTables = (connection, config, filterCallback) => {
    return new Promise((resolve, reject) => {
        connection.query('SHOW FULL TABLES IN `' + config.database + '` WHERE TABLE_TYPE NOT LIKE "VIEW"', (err, tablesRaw) => {
            if (err) return reject(err);

            resolve(tablesRaw.filter(t => filterCallback(t, config)));
        });
    });
}

/**
 * 
 * @param {Array} viewTables - Raw view tables queried from database
 * @param {Function} replaceDatabaseNameFn - A callback that replaces source database name from view definition
 * @param {Function} escapeQuotesFn - A callback that escape quotes
 * @param {Object} _ - lodash
 * @return {Array} - Sanitized view tables
 */
const viewTableSanitize = (viewTables, replaceDatabaseNameFn, escapeQuotesFn, database, _) =>
    viewTables.map(vt => {
        let viewTable = _.clone(vt);
        viewTable.VIEW_DEFINITION = replaceDatabaseNameFn(
            database, escapeQuotesFn(vt.VIEW_DEFINITION));

        return viewTable;
    });

/**
 * @param {Object} connection - Database connection
 * @param {Function} sanitizeFn - A callback that sanitize the raw output from database
 */
const getViewTables = (connection, sanitizeFn) => {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = '${connection.config.database}'`, (err, viewTablesRaw) => {
            if (err) return reject(err);

            resolve(sanitizeFn(
                viewTablesRaw, replaceInContent, escapeQuotes, connection.config.database, _));
        });
    });
}

/**
 * @param {string} value - Searched value in content to replace
 * @param {string} content - Content to search value in
 */
const replaceInContent = (value, content) => {
    let pattern = new RegExp('`' + value + '`.', 'g')
    let tmp = content;

    return tmp.replace(pattern, '');
}

/**
 * @param {Object} table
 * @param {Object} config
 * @return {Array}
 */
const isTableIncluded = (table, config) => !config.excludedTables.includes(table[`Tables_in_${config.database}`]);

const convertColumns = (columns, indexFilterFn) => ({
    indexes: columns.filter(c => indexFilterFn(c)),
    columns: columns
})

/**
 * 
 * @param {Object} connection - Database connection
 * @param {string} table - Table name
 * @param {Function} convertColumnsFn - A callback thath converts columns from raw format
 * @return {Promise}
 */
const getColumns = (connection, table, convertColumnsFn) => {
    return new Promise((resolve, reject) => {
        connection.query(`SHOW FULL COLUMNS FROM ${table}`, (err, columnsRaw) => {
            if (err) return reject(err);

            resolve(convertColumnsFn(columnsRaw, filterIndexes));
        });
    });
}

let filterIndexes = column => column.Key === 'MUL' || column.Key === 'UNI';

/**
 * @param connection Object
 * @param table String
 */
let getContent = (connection, table, escapeCallback) => {
    return new Promise((resolve, reject) => {
        let rows = [];
        let content$ = new TableContent(connection, table, { max: 1, highWaterMark: Math.pow(2, 16) });

        content$.on('error', (err) => reject(err));

        content$.on('data', (chunk) => {
            rows = rows.concat(chunk);
        });

        content$.on('end', () => {
            let escapedRows = [];
            rows.forEach(r => {
                let escapedRow = [];
                for (key in r) {
                    escapedRow[key] = r[key];
                    if (typeof r[key] === 'string') {
                        escapedRow[key] = escapeCallback(r[key]);
                    }
                }

                escapedRows.push(escapedRow);
            });

            resolve(escapedRows);
        });
    });
}

let escapeQuotes = content => content.replace(/'/g, "\\'");

/**
 * @param connection Object
 * @param table String
 * @param config Object
 */
let getDependencies = (connection, table, config) => {
    return new Promise((resolve, reject) => {
        const dependenciesQuery = `
            SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE        
            LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
            ON INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS.CONSTRAINT_NAME = INFORMATION_SCHEMA.KEY_COLUMN_USAGE.CONSTRAINT_NAME
            
            WHERE
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE.REFERENCED_TABLE_SCHEMA = '${config.database}' AND
                INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS.CONSTRAINT_SCHEMA = '${config.database}' AND
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_NAME = '${table}';
        `;

        connection.query(dependenciesQuery, (err, results) => {
            if (err) return reject(err);

            let dependencies = results.map(r => {
                return {
                    sourceTable: r['TABLE_NAME'],
                    sourceColumn: r['COLUMN_NAME'],
                    referencedTable: r['REFERENCED_TABLE_NAME'],
                    referencedColumn: r['REFERENCED_COLUMN_NAME'],
                    updateRule: r['UPDATE_RULE'],
                    deleteRule: r['DELETE_RULE']
                };
            });

            resolve(_.uniqBy(dependencies, 'sourceColumn'));
        });
    });
}

let getProcedures = (connection, objectConverter, escapeCallback) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT *
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_SCHEMA = '${connection.config.database}';
        `;

        connection.query(query, (err, proceduresRaw) => {
            if (err) return reject(err);
            let procedures = [];

            if (proceduresRaw.length === 0) {
                resolve([]);
            }

            proceduresRaw.forEach((p, i) => {
                connection.query('SHOW CREATE ' + p['ROUTINE_TYPE'].toUpperCase() + ' `' + p['ROUTINE_NAME'] + '`', (err, result) => {
                    if (err) return reject(err);

                    let tmp = { type: p['ROUTINE_TYPE'] };
                    if (p['ROUTINE_TYPE'] === 'FUNCTION') {
                        tmp.name = result[0]['Function'];
                        tmp.definition = escapeCallback(result[0]['Create Function']);

                    } else if (p['ROUTINE_TYPE'] === 'PROCEDURE') {
                        tmp.name = result[0]['Procedure'];
                        tmp.definition = escapeCallback(result[0]['Create Procedure']);
                    }

                    procedures.push(tmp);

                    if (i === proceduresRaw.length - 1) {
                        resolve(procedures);
                    }
                });
            });

        });
    });
}

/**
 * @param procedures Object
 * @return Object
 */
let convertProceduresToObjects = (proceduresRaw) => {
    let procedures = {};

    proceduresRaw.forEach(p => {
        procedures[p['SPECIFIC_NAME']] = {
            type: p['ROUTINE_TYPE'],
            definition: p['ROUTINE_DEFINITION'],
            definer: p['DEFINER']
        };
    });

    return procedures;
}

let getTriggers = (connection, escapeCallback, _) => {
    return new Promise((resolve, reject) => {
        const query = 'SHOW TRIGGERS FROM `' + connection.config.database + '`';

        connection.query(query, (err, triggers) => {
            if (err) return reject(err);

            let escaped = {};
            triggers.forEach(t => {
                if (!_.has(escaped, t.Table)) {
                    _.set(escaped, t.Table, []);
                }

                escaped[t.Table].push({
                    name: t.Trigger,
                    event: t.Event,
                    timing: t.Timing,
                    statement: escapeCallback(t.Statement),
                    definer: t.Definer,
                    table: t.Table,
                    database: connection.config.database
                });
            });

            resolve(escaped);
        });
    });
}

/**
 * @param connection Object
 * @param query Object
 * @param config Object
 * @return Promise
 */
let getTableData = (connection, query, config) => {
    return new Promise((resolve, reject) => {
        let tableData = [];
        const tableKey = `Tables_in_${config.database}`;

        query.getTables(connection, config, query.isTableIncluded)
            .then(tables => {
                tables.forEach((tableRaw, index) => {
                    const table = tableRaw[tableKey];
                    tableData.push({
                        table,
                        dependencies: []
                    });

                    let columnsPromise = query.getColumns(connection, table, query.convertColumns);
                    let dependenciesPromise = query.getDependencies(connection, table, config);
                    let contentPromise = query.getContent(connection, table, query.escapeQuotes);

                    Promise.all([columnsPromise, dependenciesPromise, contentPromise])
                        .then(values => {
                            values.forEach(v => {
                                if (_.get(v, ['columns'], null)) {                  // Columns
                                    tableData[index].columns = v.columns;
                                    tableData[index].indexes = v.indexes;
                                } else if (_.get(v, [0, 'sourceTable'], null)) {    // Dependencies
                                    tableData[index].dependencies = v;
                                } else {                                            // Content
                                    tableData[index].content = v;
                                }

                                if (index === tables.length - 1) {
                                    resolve(tableData);
                                }
                            });
                        });
                });
            })
            .catch(err => {
                reject(err);
            });
    });
}

module.exports = {
    getTables,
    getColumns,
    getDependencies,
    getTableData,
    getContent,
    getProcedures,
    getTriggers,
    getViewTables,
    convertProceduresToObjects,
    filterIndexes,
    isTableIncluded,
    escapeQuotes,
    viewTableSanitize,
    convertColumns
}