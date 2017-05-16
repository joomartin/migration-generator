const _ = require('lodash');

/**
 * @param connection Object
 * @param config Object
 * @return Promise
 */
let getTables = (connection, config) => {
    return new Promise((resolve, reject) => {
        connection.query('SHOW TABLES', (err, tablesRaw) => {
            if (err) reject(err);

            resolve(filterExcludedTables(tablesRaw, config));
        });
    });
}

/**
 * @param connection Object
 * @param table String
 * @return Promise
 */
let getColumns = (connection, table) => {
    return new Promise((resolve, reject) => {
        connection.query(`SHOW FULL COLUMNS FROM ${table}`, (err, columnsRaw) => {
            if (err) reject(err);

            resolve(columnsRaw);
        });
    });
}

/**
 * @param connection Object
 * @param table String
 */
let getContent = (connection, table) => {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM ${table}`, (err, rows) => {
            if (err) reject(err);

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

        query.getTables(connection, config)
            .then(tables => {
                tables.forEach((tableRaw, index) => {
                    const table = tableRaw[tableKey];
                    tableData[table] = {
                        table,
                        allDependencyOrdered: false,
                        dependencies: []
                    };

                    let columnsPromise = query.getColumns(connection, table);
                    let dependenciesPromise = query.getDependencies(connection, table, config);
                    let contentPromise = query.getContent(connection, table); 

                    Promise.all([columnsPromise, dependenciesPromise, contentPromise])
                        .then(values => {
                            values.forEach(v => {
                                if (_.get(v, [0, 'Field'], null)) {                                    
                                    tableData[table].columns = v;
                                } else if (_.get(v, [0, 'sourceTable'], null)) {
                                    tableData[table].dependencies = v;
                                } else {
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
let filterExcludedTables = (tablesRaw, config) => {
    const tableKey = `Tables_in_${config.database}`;
    return tables = tablesRaw
        .filter(t => !config.excludedTables.includes(t[tableKey]));
}

module.exports = {
    getTables,
    getColumns,
    getDependencies,
    getTableData,
    getContent,
    filterExcludedTables
}