const TableContent = require('./stream/table-content');
const queryProcess = require('../business/query-process');

const run = (connection, queryString) =>
    new Promise((resolve, reject) => 
        connection.query(queryString, (err, results) => 
            err ? reject(err) : resolve(results)   
        )
    );

const getTables = connection =>
    run(connection, 'SHOW FULL TABLES IN `' + connection.config.database + '` WHERE TABLE_TYPE NOT LIKE "VIEW"');

const getViewTables = connection =>
    run(connection, `SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = '${connection.config.database}'`)

const getColumns = (connection, table) =>
    run(connection, 'SHOW FULL COLUMNS FROM `' + table + '`');

const getCreateTable = (connection, table) => 
        run(connection, 'SHOW CREATE TABLE `' +  table +  '`')
            .then(results => results[0]['Create Table']);

const getProceduresMeta = connection => 
        run(connection, `SELECT * FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = '${connection.config.database}'`);

const getProcedureDefinition = (connection, meta) =>
        run(connection, 'SHOW CREATE ' + meta.type.toUpperCase() + ' `' + meta.name + '`')
            .then(results => ({ type: meta.type, definition: results[0] }));

const getTriggers = connection => 
        run(connection, 'SHOW TRIGGERS FROM `' + connection.config.database + '`');

/**
 * @param {TableContent} content$ - Readable stream that reads content of a tablo
 * @return {Promise} - Contains array
 */
const getContent = (content$) => 
    new Promise((resolve, reject) => {
        let rows = [];

        content$.on('error', err => reject(err));

        content$.on('data', chunk => {
            rows = rows.concat(chunk);
        });

        content$.on('end', () => {
            resolve(rows);
        });
    });

/**
 * @param {Object} connection - Database connection
 * @return {Promise} - Contains array
 */
const getProcedures = (connection) => 
    new Promise((resolve, reject) => {
        getProceduresMeta(connection)
            .then(metas =>
                metas.map(meta => getProcedureDefinition(connection, { name: meta['SPECIFIC_NAME'], type: meta['ROUTINE_TYPE']}))
            )
            .then(promises => Promise.all(promises))
            .then(resolve)
            .catch(reject);
    });

/**
 * @param {Object} connection 
 * @param {Object} config 
 */
const getTableData = (connection, config) =>
    new Promise((resolve, reject) => {
        let tableData = [];

        getTables(connection)
            .then(queryProcess.mapTables(config))
            .then(queryProcess.filterExcluededTables(config))
            .then(tables => {
                tables.forEach((table, index) => {
                    tableData.push({
                        table,
                        dependencies: []
                    });

                    const content$ = new TableContent(connection, table, { max: 1, highWaterMark: Math.pow(2, 16) });


                    let columnsPromise = getColumns(connection, table);
                    let createTablePromise = getCreateTable(connection, table);
                    let contentPromise = getContent(content$);

                    Promise.all([columnsPromise, createTablePromise, contentPromise])
                        .then(([columns, createTable, content]) => {
                            tableData[index].columns = columns;
                            tableData[index].indexes = queryProcess.filterIndexes(columns);
                            tableData[index].dependencies = queryProcess.parseDependencies(table, createTable);
                            tableData[index].content = queryProcess.escapeRows(content);

                            if (index === tables.length - 1) {
                                return resolve(tableData);
                            }
                        })
                        .catch(err => {
                            return reject(err);
                        });
                });
            })
            .catch(err => {
                return reject(err);
            });
    });

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
    getProcedureDefinition,
}
