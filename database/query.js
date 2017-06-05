const _ = require('lodash');

const TableContent = require('./stream/table-content');
const queryProcessFactory = require('../business/query-process-factory');
const utils = require('../utils/utils');
const strUtils = require('../utils/str');

/**
 * @param {Object} connection - Database connection
 * @param {Object} config - App config
 * @param {Function} filterFn - A callback that filters out excluded tables
 * @param {Function} concatFn - A callack that concats string
 * @return {Promise} - Contains array
 */
const getTables = (connection, config, filterFn, concatFn) => {
    return new Promise((resolve, reject) => {
        connection.query(concatFn('SHOW FULL TABLES IN `', config.database, '` WHERE TABLE_TYPE NOT LIKE "VIEW"'), (err, tables) => 
            err ? reject(err) : resolve(filterFn(tables, config)));
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {Function} sanitizeFn - A callback that sanitize raw output
 * @param {Function} concatFn - A callack that concats string
 * @return {Promise} - Contains array
 */
const getViewTables = (connection, sanitizeFn, concatFn) => {
    return new Promise((resolve, reject) => {
        connection.query(concatFn("SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = '", connection.config.database, "'"), (err, viewTables) => 
            err ? reject(err) : resolve(sanitizeFn(viewTables)));
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {string} table - Table name
 * @param {Function} seperateColumnsFn - A callback thath converts columns from raw format
 * @param {Function} concatFn - A callack that concats string
 * @return {Promise} - Contains array
 */
const getColumns = (connection, table, seperateColumnsFn, concatFn) => {
    return new Promise((resolve, reject) => {
        connection.query(concatFn('SHOW FULL COLUMNS FROM `', table, '`'), (err, columns) => 
            (err) ? reject(err) : resolve(seperateColumnsFn(columns)));
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
 * @param {Function} concatFn - A callack that concats string
 * @returns {Promise} - Contains array
 */
const getDependencies = (connection, table, mapDependenciesFn, concatFn) => {
    return new Promise((resolve, reject) => {
        // SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE runs for 30ms. It runs for 0,5 .. 1ms
        connection.query(concatFn('SHOW CREATE TABLE `', table, '`'), (err, result) => 
            (err) ? reject(err) : resolve(mapDependenciesFn(table, result[0]['Create Table'])));
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {Function} getProceduresMetaFn - A function that queries procedures meta data
 * @param {Function} getProcedureDefinitionFn - A function that queries a procedure definition
 * @param {Function} normalizeDefinitionFn - A function that normalizes raw output
 */
const getProcedures = (connection, getProceduresMetaFn, getProcedureDefinitionFn, normalizeDefinitionFn, concatFn) => {
    return new Promise((resolve, reject) => {
        getProceduresMetaFn(connection, concatFn)
            .then(metas =>
                metas.map(meta => getProcedureDefinitionFn(connection, meta['SPECIFIC_NAME'], meta['ROUTINE_TYPE'], normalizeDefinitionFn))
            )
            .then(promises => Promise.all(promises))
            .then(resolve)
            .catch(reject);
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {Function} concatFn - A callack that concats string
 * @return {Promise} - Contains array
 */
const getProceduresMeta = (connection, concatFn) => {
    return new Promise((resolve, reject) => {
        connection.query(concatFn("SELECT * FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = '", connection.config.database, "'"), (err, procedures) => 
            (err) ? reject(err) : resolve(procedures));
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

        query.getTables(connection, config, queryProcess.filterExcluededTables, strUtils.concat)
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
                    const getDependenciesFromCreateTableFn = queryProcessFactory.getDependenciesFromCreateTableFactory(_, strUtils.substringFrom);

                    let columnsPromise = query.getColumns(connection, table, seperateColumnsFn, strUtils.concat);
                    let dependenciesPromise = query.getDependencies(connection, table, getDependenciesFromCreateTableFn, strUtils.concat);
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
                        })
                        .catch(err => {
                            reject(err);
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
