const _ = require('lodash');

const TableContent = require('./stream/table-content');
const queryProcessFactory = require('../business/query-process-factory');
const utils = require('../utils/utils');
const strUtils = require('../utils/str');

/**
 * @param {Object} connection - Database connection
 * @param {Object} config - App config
 * @return {Promise} - Contains array
 */
const getTables = (connection, concatFn) => {
    return new Promise((resolve, reject) => {
        connection.query(concatFn('SHOW FULL TABLES IN `', connection.config.database, '` WHERE TABLE_TYPE NOT LIKE "VIEW"'), (err, tables) => 
            err ? reject(err) : resolve(tables));
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {Function} concatFn - A callack that concats string
 * @return {Promise} - Contains array
 */
const getViewTables = (connection, concatFn) => {
    return new Promise((resolve, reject) => {
        connection.query(concatFn("SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = '", connection.config.database, "'"), (err, viewTables) => 
            err ? reject(err) : resolve(viewTables));
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {string} table - Table name
 * @param {Function} concatFn - A callack that concats string
 * @return {Promise} - Contains array
 */
const getColumns = (connection, table, concatFn) => {
    return new Promise((resolve, reject) => {
        connection.query(concatFn('SHOW FULL COLUMNS FROM `', table, '`'), (err, columns) => 
            (err) ? reject(err) : resolve(columns));
    });
}

/**
 * @param {TableContent} content$ - Readable stream that reads content of a tablo
 * @return {Promise} - Contains array
 */
const getContent = (content$) => {
    return new Promise((resolve, reject) => {
        let rows = [];

        content$.on('error', err => reject(err));

        content$.on('data', chunk => {
            rows = rows.concat(chunk);
        });

        content$.on('end', () => {
            resolve(rows);
        });
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {string} table - Table name
 * @param {Function} concatFn - A callack that concats string
 * @returns {Promise} - Contains array
 */
const getCreateTable = (connection, table, concatFn) => {
    return new Promise((resolve, reject) => {
        // SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE runs for 30ms. It runs for 0,5 .. 1ms
        connection.query(concatFn('SHOW CREATE TABLE `', table, '`'), (err, result) => 
            (err) ? reject(err) : resolve(result[0]['Create Table']));
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {Function} getProceduresMetaFn - A function that queries procedures meta data
 * @param {Function} getProcedureDefinitionFn - A function that queries a procedure definition
 * @param {Function} concatFn - A function that concats strings
 * @return {Promise} - Contains array
 */
const getProcedures = (connection, getProceduresMetaFn, getProcedureDefinitionFn, concatFn) => {
    return new Promise((resolve, reject) => {
        getProceduresMetaFn(connection, concatFn)
            .then(metas =>
                metas.map(meta => getProcedureDefinitionFn(connection, { name: meta['SPECIFIC_NAME'], type: meta['ROUTINE_TYPE']}, concatFn))
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
 * @param {Object} meta - Contains meta data about procedure like name, type
 * @param {Function} concatFn - A callack that concats string 
 * @return {Promise} - Contains an object
 */
const getProcedureDefinition = (connection, meta, concatFn) => {
    return new Promise((resolve, reject) => {
        connection.query(concatFn('SHOW CREATE ', meta.type.toUpperCase(), '`', meta.name, '`'), (err, definition) => 
            (err) ? reject(err) : resolve({ type: meta.type, definition: definition[0] }));
    });
}

/**
 * @param {Object} connection - Database connection
 * @param {Function} mapFn - A callback that maps raw results
 * @param {Function} concatFn - A callack that concats string 
 * @return {Promise} - Contains array
 */
const getTriggers = (connection, mapFn, concatFn) => {
    return new Promise((resolve, reject) => {
        connection.query(concatFn('SHOW TRIGGERS FROM `', connection.config.database, '`'), (err, triggers) => 
            (err) ? reject(err) : resolve(mapFn(connection.config.database, triggers)));
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

        query.getTables(connection, strUtils.concat)
            .then(tables => queryProcess.filterExcluededTables(tables, config))
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
                    const parseDependenciesFn = queryProcessFactory.parseDependenciesFactory(_, strUtils.substringFrom);

                    let columnsPromise = query.getColumns(connection, table, strUtils.concat);
                    let createTablePromise = query.getCreateTable(connection, table, strUtils.concat);
                    let contentPromise = query.getContent(content$);

                    Promise.all([columnsPromise, createTablePromise, contentPromise])
                        .then(([columns, createTable, content]) => {
                            tableData[index].columns = columns;
                            tableData[index].indexes = queryProcess.filterIndexes(columns);
                            tableData[index].dependencies = parseDependenciesFn(table, createTable);
                            tableData[index].content = escapeRowsFn(content);

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
    getCreateTable,
    getTableData,
    getContent,
    getProcedures,
    getTriggers,
    getViewTables,
    getProceduresMeta,
    getProcedureDefinition
}
