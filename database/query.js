const _ = require('lodash');

/**
 * @param connection Object
 * @param config Object
 * @return Promise
 */
let getTables = (connection, config, filterCallback) => {
    return new Promise((resolve, reject) => {
        connection.query('SHOW TABLES', (err, tablesRaw) => {
            if (err) return reject(err);

            resolve(tablesRaw.filter(t => filterCallback(t, config)));
        });
    });
}

/**
 * @param connection Object
 * @param table String
 * @return Promise
 */
let getColumns = (connection, table, indexFilterCallback) => {
    return new Promise((resolve, reject) => {
        connection.query(`SHOW FULL COLUMNS FROM ${table}`, (err, columnsRaw) => {
            if (err) return reject(err);
            let result = {
                indexes: columnsRaw.filter(c => indexFilterCallback(c)),
                columns: columnsRaw
            };

            resolve(result);
        });
    });
}

let filterIndexes = column => column.Key === 'MUL' || column.Key === 'UNI';

/**
 * @param connection Object
 * @param table String
 */
let getContent = (connection, table) => {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM ${table}`, (err, rows) => {
            if (err) return reject(err);

            resolve(rows);
        });
    });
}

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

let getProcedures = (connection, objectConverter) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT *
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_SCHEMA = '${connection.config.database}';
        `;

        connection.query(query, (err, proceduresRaw) => {
            if (err) return reject(err);

            resolve(objectConverter(proceduresRaw));
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

/**
 * @param connection Object
 * @param query Object
 * @param config Object
 * @return Promise
 */
let getTableData = (connection, query, config) => {
    return new Promise((resolve, reject) => {
        let tableData = {};
        const tableKey = `Tables_in_${config.database}`;

        query.getTables(connection, config, query.isTableIncluded)
            .then(tables => {
                tables.forEach((tableRaw, index) => {
                    const table = tableRaw[tableKey];
                    tableData[table] = {
                        table,
                        allDependencyOrdered: false,
                        dependencies: []
                    };

                    let columnsPromise = query.getColumns(connection, table, query.filterIndexes);
                    let dependenciesPromise = query.getDependencies(connection, table, config);
                    let contentPromise = query.getContent(connection, table);

                    Promise.all([columnsPromise, dependenciesPromise, contentPromise])
                        .then(values => {
                            values.forEach(v => {
                                if (_.get(v, ['columns'], null)) {                  // Columns
                                    tableData[table].columns = v.columns;
                                    tableData[table].indexes = v.indexes;
                                } else if (_.get(v, [0, 'sourceTable'], null)) {    // Dependencies
                                    tableData[table].dependencies = v;
                                } else {                                            // Content
                                    tableData[table].content = v;
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

/**
 * @param tablesRaw Array
 * @param config Object
 * @return Array
 */
let isTableIncluded = (table, config) => !config.excludedTables.includes(table);

module.exports = {
    getTables,
    getColumns,
    getDependencies,
    getTableData,
    getContent,
    getProcedures,
    convertProceduresToObjects,
    filterIndexes,
    isTableIncluded,
    convertProceduresToObjects
}