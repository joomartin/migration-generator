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

/**
 * @param {Array} columns - Collection of table column objects
 * @param {Function} isIndexFn - A callback that filter out index column
 */
const convertColumns = (columns, isIndexFn) => ({
    indexes: columns.filter(c => isIndexFn(c)),
    columns: columns
})

/**
 * @param {Object} connection - Database connection
 * @param {string} table - Table name
 * @param {Function} convertColumnsFn - A callback thath converts columns from raw format
 * @return {Promise}
 */
const getColumns = (connection, table, convertColumnsFn) => {
    return new Promise((resolve, reject) => {
        connection.query(`SHOW FULL COLUMNS FROM ${table}`, (err, columnsRaw) => {
            if (err) return reject(err);

            resolve(convertColumnsFn(columnsRaw, isIndex));
        });
    });
}

/**
 * @param {Object} column - A table column
 * @returns {boolean}
 */
const isIndex = column => column.Key === 'MUL' || column.Key === 'UNI';

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

/**
 * @param {string} content - Any string
 * @return {string}
 */
const escapeQuotes = content => content.replace(/'/g, "\\'");

/**
 * @param connection Object
 * @param table String
 * @param config Object
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
 * @param {Object} connection 
 * @param {Function} mapDefinitionFn 
 */
const getProcedures = (connection, mapDefinitionFn) => {
    return new Promise((resolve, reject) => {
        getProceduresMeta(connection)
            .then(metas =>
                metas.map(meta => getProcedureDefinition(connection, meta['SPECIFIC_NAME'], meta['ROUTINE_TYPE'], mapDefinitionFn))
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
 * @param {Object} connection
 * @returns {Promise} 
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

            if (proceduresRaw.length === 0) {
                resolve([]);
            }

            resolve(proceduresRaw);
        });
    });
}

/**
 * @param {Object} connection 
 * @param {string} name 
 * @param {string} type 
 * @param {Function} mapDefinitionFn 
 */
const getProcedureDefinition = (connection, name, type, mapDefinitionFn) => {
    return new Promise((resolve, reject) => {
        connection.query('SHOW CREATE ' + type.toUpperCase() + ' `' + name + '`', (err, result) => {
            if (err) return reject(err);

            resolve(mapDefinitionFn(type, result[0], escapeQuotes));
        });
    });
}

/**
 * @param {string} type 
 * @param {Object} definition 
 * @param {Function} escapeFn 
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

const getTriggers = (connection, escapeFn, _) => {
    return new Promise((resolve, reject) => {
        const query = 'SHOW TRIGGERS FROM `' + connection.config.database + '`';

        connection.query(query, (err, triggers) => {
            if (err) return reject(err);

            resolve(mapTriggers(connection.config.database, triggers, escapeFn, _));
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
                    let dependenciesPromise = query.getDependencies(connection, table, config, mapDependencies, _);
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
    isIndex,
    isTableIncluded,
    escapeQuotes,
    viewTableSanitize,
    convertColumns,
    mapDependencies,
    mapProcedureDefinition,
    replaceInContent
}
