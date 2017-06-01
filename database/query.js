const _ = require('lodash');

const TableContent = require('./stream/table-content');

/**
 * @param {Object} connection - Database connection
 * @param {Object} config - App config
 * @param {Function} filterFn - A callback that filters out excluded tables
 * @return {Promise} - Contains array
 */
const getTables = (connection, config, filterFn) => {
    return new Promise((resolve, reject) => {
        connection.query('SHOW FULL TABLES IN `' + config.database + '` WHERE TABLE_TYPE NOT LIKE "VIEW"', (err, tablesRaw) => {
            if (err) return reject(err);

            resolve(filterFn(tablesRaw, config));
        });
    });
}

/**
 * 
 * @param {Object} connection - Database connection
 * @param {Function} replaceDatabaseNameFn - A calback that replaces source database name fom view definition
 * @param {Function} escapeFn - A callback that escapes quotes
 * @param {Function} sanitizeFn - A callback that sanitize raw output
 * @param {Object} _ - lodash
 * @return {Promise} - Contains array
 */
const getViewTables = (connection, replaceDatabaseNameFn, escapeFn, sanitizeFn, _) => {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = '${connection.config.database}'`, (err, viewTablesRaw) => {
            if (err) return reject(err);

            resolve(sanitizeFn(
                viewTablesRaw, replaceDatabaseNameFn, escapeFn, connection.config.database, _));
        });
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {string} table - Table name
 * @param {Function} convertColumnsFn - A callback thath converts columns from raw format
 * @return {Promise} - Contains array
 */
const getColumns = (connection, table, convertColumnsFn, filterIndexesFn) => {
    return new Promise((resolve, reject) => {
        connection.query(`SHOW FULL COLUMNS FROM ${table}`, (err, columnsRaw) => {
            if (err) return reject(err);

            resolve(convertColumnsFn(columnsRaw, filterIndexesFn));
        });
    });
}

/**
 * @param {Array} columns - Raw mysql columns
 * @return {Array} 
 */
const filterIndexes = (columns) => columns.filter(c => c.Key === 'MUL' || c.Key === 'UNI');

/**
 * @param {TableContent} content$ - Readable stream that reads content of a tablo
 * @param {Function} escapeFn - A callback that escaps quotes
 * @param {Function} processFn - A callback that processes the raw output
 * @return {Promise} - Contains array
 */
const getContent = (content$, escapeFn, processFn) => {
    return new Promise((resolve, reject) => {
        let rows = [];

        content$.on('error', err => reject(err));

        content$.on('data', chunk => {
            rows = rows.concat(chunk);
        });

        content$.on('end', () => {
            resolve(processFn(rows, escapeFn));
        });
    });
}

/**
 * @param {Array} rows - raw mysql content
 * @param {Function} escapeFn - A callback that escapes quotes
 * @return {Array}
 */
const processContent = (rows, escapeFn) => {
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
 * @param {string} content - Any string
 * @return {string}
 */
const escapeQuotes = content => content.replace(/'/g, "\\'");

/**
 * @param {Object} connection - Database connection
 * @param {string} table - Table name
 * @param {Object} config - App config
 * @param {Function} mapDependenciesFn - A callback that maps raw dependencies 
 * @param {Object} _ - lodash
 * @returns {Promise} - Contains array
 */
const getDependencies = (connection, table, config, mapDependenciesFn, _) => {
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

            resolve(mapDependenciesFn(results, _));
        });
    });
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
 * @param {Object} connection - Database connection
 * @param {Function} mapDefinitionFn - A callback that maps definitions
 * @param {Function} escapeFn - A callback that escapes quotes
 * @return {Promise} - Contains array
 */
const getProcedures = (connection, mapDefinitionFn, escapeFn) => {
    return new Promise((resolve, reject) => {
        getProceduresMeta(connection)
            .then(metas =>
                metas.map(meta => getProcedureDefinition(connection, meta['SPECIFIC_NAME'], meta['ROUTINE_TYPE'], mapDefinitionFn, escapeFn))
            )
            .then(promises => {
                Promise.all(promises)
                    .then(resolve)
                    .catch(reject);
            })
            .catch(reject);
    });
}

/**
 * @param {Object} connection - Database connection
 * @return {Promise} - Contains array
 */
const getProceduresMeta = (connection) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT *
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_SCHEMA = '${connection.config.database}';
        `;

        connection.query(query, (err, proceduresRaw) => {
            if (err) return reject(err);

            resolve(proceduresRaw);
        });
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {string} name - Procedure name
 * @param {string} type - Type (function or procedure)
 * @param {Function} mapDefinitionFn - A callback that maps definition
 * @param {Function} escapeFn - A callback that escapes quotes
 * @return {Promise} - Contains an object
 */
const getProcedureDefinition = (connection, name, type, mapDefinitionFn, escapeFn) => {
    return new Promise((resolve, reject) => {
        connection.query('SHOW CREATE ' + type.toUpperCase() + ' `' + name + '`', (err, result) => {
            if (err) return reject(err);

            resolve(mapDefinitionFn(type, result[0], escapeFn));
        });
    });
}

/**
 * @param {string} type - Procedure or function
 * @param {Object} definition - Definition
 * @param {Function} escapeFn - A callback that escapes quotes
 * @return {Object}
 */
const mapProcedureDefinition = (type, definition, escapeFn) => {
    const createColumn = type.toUpperCase() === 'FUNCTION' ? 'Create Function' : 'Create Procedure';
    const typeColumn = type.toUpperCase() === 'FUNCTION' ? 'Function' : 'Procedure';

    return {
        type,
        name: definition[typeColumn],
        definition: escapeFn(definition[createColumn])
    };
}

/**
 * @param {string} database - Name of database
 * @param {Array} triggers - List of triggers in raw format
 * @param {Function} escapeFn - Callback that escape quotes
 * @param {Object} _ - lodash
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

/**
 * @param {Object} connection - Database connection
 * @param {Function} mapFn - A callback that maps raw results
 * @param {Function} escapeFn - A callback that escape quotes
 * @param {Object} _ - lodash
 */
const getTriggers = (connection, mapFn, escapeFn, _) => {
    return new Promise((resolve, reject) => {
        const query = 'SHOW TRIGGERS FROM `' + connection.config.database + '`';

        connection.query(query, (err, triggers) => {
            if (err) return reject(err);

            resolve(mapFn(connection.config.database, triggers, escapeFn, _));
        });
    });
}

/**
 * 
 * @param {Object} connection 
 * @param {Object} query 
 * @param {Object} config 
 */
const getTableData = (connection, query, config, queryProcess) => {
    return new Promise((resolve, reject) => {
        let tableData = [];
        const tableKey = `Tables_in_${config.database}`;

        query.getTables(connection, config, queryProcess.filterExcluededTables)
            .then(tables => {
                tables.forEach((tableRaw, index) => {
                    const table = tableRaw[tableKey];
                    tableData.push({
                        table,
                        dependencies: []
                    });

                    const content$ = new TableContent(connection, table, { max: 1, highWaterMark: Math.pow(2, 16) });

                    let columnsPromise = query.getColumns(connection, table, queryProcess.seperateColumns, query.filterIndexes);
                    let dependenciesPromise = query.getDependencies(connection, table, config, mapDependencies, _);
                    let contentPromise = query.getContent(content$, query.escapeQuotes, query.processContent);

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
    escapeQuotes,
    mapDependencies,
    getProceduresMeta,
    getProcedureDefinition,
    mapProcedureDefinition,
    mapTriggers,
    filterIndexes,
    processContent
}
