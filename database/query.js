const _ = require('lodash');

const TableContent = require('./stream/table-content');
const queryProcessFactory = require('../business/query-process-factory');
const utils = require('../utils/utils');

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
 * @param {Function} sanitizeFn - A callback that sanitize raw output
 * @return {Promise} - Contains array
 */
const getViewTables = (connection, sanitizeFn) => {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = '${connection.config.database}'`, (err, viewTablesRaw) => {
            if (err) return reject(err);

            resolve(sanitizeFn(viewTablesRaw));
        });
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {string} table - Table name
 * @param {Function} seperateColumnsFn - A callback thath converts columns from raw format
 * @return {Promise} - Contains array
 */
const getColumns = (connection, table, seperateColumnsFn) => {
    return new Promise((resolve, reject) => {
        connection.query(`SHOW FULL COLUMNS FROM ${table}`, (err, columnsRaw) => {
            if (err) return reject(err);

            resolve(seperateColumnsFn(columnsRaw));
        });
    });
}

/**
 * @param {TableContent} content$ - Readable stream that reads content of a tablo
 * @param {Function} processFn - A callback that processes the raw output
 * @return {Promise} - Contains array
 */
const getContent = (content$, processFn) => {
    return new Promise((resolve, reject) => {
        let rows = [];

        content$.on('error', err => reject(err));

        content$.on('data', chunk => {
            rows = rows.concat(chunk);
        });

        content$.on('end', () => {
            resolve(processFn(rows));
        });
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {string} table - Table name
 * @param {Function} mapDependenciesFn - A callback that maps raw dependencies 
 * @returns {Promise} - Contains array
 */
const getDependencies = (connection, table, mapDependenciesFn) => {
    return new Promise((resolve, reject) => {
        const dependenciesQuery = `
            SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE        
            LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
            ON INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS.CONSTRAINT_NAME = INFORMATION_SCHEMA.KEY_COLUMN_USAGE.CONSTRAINT_NAME
            
            WHERE
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE.REFERENCED_TABLE_SCHEMA = '${connection.config.database}' AND
                INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS.CONSTRAINT_SCHEMA = '${connection.config.database}' AND
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_NAME = '${table}';
        `;

        connection.query(dependenciesQuery, (err, results) => {
            if (err) return reject(err);

            resolve(mapDependenciesFn(results));
        });
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {Function} getProceduresMetaFn - A function that queries procedures meta data
 * @param {Function} getProcedureDefinitionFn - A function that queries a procedure definition
 * @param {Function} normalizeDefinitionFn - A function that normalizes raw output
 */
const getProcedures = (connection, getProceduresMetaFn, getProcedureDefinitionFn, normalizeDefinitionFn) => {
    return new Promise((resolve, reject) => {
        getProceduresMetaFn(connection)
            .then(metas =>
                metas.map(meta => getProcedureDefinitionFn(connection, meta['SPECIFIC_NAME'], meta['ROUTINE_TYPE'], normalizeDefinitionFn))
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
 * @param {Function} normalizeDefinitionFn - A callback that normalizes definition
 * @return {Promise} - Contains an object
 */
const getProcedureDefinition = (connection, name, type, normalizeDefinitionFn) => {
    return new Promise((resolve, reject) => {
        connection.query('SHOW CREATE ' + type.toUpperCase() + ' `' + name + '`', (err, result) => {
            if (err) return reject(err);

            resolve(normalizeDefinitionFn(type, result[0]));
        });
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {Function} mapFn - A callback that maps raw results
 * @return {Promise} - Contains array
 */
const getTriggers = (connection, mapFn) => {
    return new Promise((resolve, reject) => {
        const query = 'SHOW TRIGGERS FROM `' + connection.config.database + '`';

        connection.query(query, (err, triggers) => {
            if (err) return reject(err);

            resolve(mapFn(connection.config.database, triggers));
        });
    });
}

/**
 * @param {Object} connection 
 * @param {Object} query 
 * @param {Object} config 
 * @param {Object} queryProcess 
 * @param {Object} utils 
 */
const getTableData = (connection, query, config, queryProcess, utils) => {
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

                    const seperateColumnsFn = queryProcessFactory.seperateColumnsFactory(queryProcess.filterIndexes);
                    const escapeRowsFn = queryProcessFactory.escapeRowsFactory(utils.escapeQuotes);
                    const mapDependenciesFn = queryProcessFactory.mapDependenciesFactory(_);

                    let columnsPromise = query.getColumns(connection, table, seperateColumnsFn);
                    let dependenciesPromise = query.getDependencies(connection, table, mapDependenciesFn);
                    let contentPromise = query.getContent(content$, escapeRowsFn);

                    Promise.all([columnsPromise, dependenciesPromise, contentPromise])
                        .then(([columns, dependencies, content]) => {
                            tableData[index].columns = columns.columns;
                            tableData[index].indexes = columns.indexes;
                            tableData[index].dependencies = dependencies;
                            tableData[index].content = content;

                            if (index === tables.length - 1) {
                                resolve(tableData);
                            }
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
    getProceduresMeta,
    getProcedureDefinition
}
