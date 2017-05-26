const _ = require('lodash');

/**
 * @param connection Object
 * @param config Object
 * @return Promise
 */
let getTables = (connection, config, filterCallback) => {
    return new Promise((resolve, reject) => {
        connection.query('SHOW FULL TABLES IN `' + config.database + '` WHERE TABLE_TYPE NOT LIKE "VIEW"', (err, tablesRaw) => {
            if (err) return reject(err);

            resolve(tablesRaw.filter(t => filterCallback(t, config)));
        });
    });
}

/**
 * @param connection Object
 * @return Promise
 */
let getViewTables = (connection, escapeCallback) => {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = '${connection.config.database}'`, (err, viewTablesRaw) => {
            if (err) return reject(err);

            let escaped = viewTablesRaw.map(vt => {
                vt.VIEW_DEFINITION = escapeCallback(vt.VIEW_DEFINITION)
                return vt;
            });

            resolve(escaped);
        });
    });
}

/**
 * @param tablesRaw Array
 * @param config Object
 * @return Array
 */
let isTableIncluded = (table, config) => !config.excludedTables.includes(table[`Tables_in_${config.database}`]);

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
let getContent = (connection, table, escapeCallback) => {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM ${table}`, (err, rows) => {
            if (err) return reject(err);

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



let escapeJsonContent = content => content.replace(/'/g, "\\'");
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
            
            let converted = objectConverter(proceduresRaw);
            let escaped = {};
            for (procedure in converted) {
                escaped[procedure] = converted[procedure];
                escaped[procedure].definition = escapeCallback(converted[procedure].definition);
            }

            resolve(escaped);
        });
    });
}

let escapeQuotes = content => content.replace(/'/g, "\\'");

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
                    let contentPromise = query.getContent(connection, table, query.escapeJsonContent);

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

module.exports = {
    getTables,
    getColumns,
    getDependencies,
    getTableData,
    getContent,
    getProcedures,
    getViewTables,
    convertProceduresToObjects,
    filterIndexes,
    isTableIncluded,
    convertProceduresToObjects,
    escapeQuotes
}