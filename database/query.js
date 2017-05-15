let getTables = (connection, config) => {
    return new Promise((resolve, reject) => {
        connection.query('SHOW TABLES', (err, tablesRaw) => {
            if (err) reject(err);

            resolve(filterExcludedTables(tablesRaw, config));
        });
    });
}

let filterExcludedTables = (tablesRaw, config) => {
    const tableKey = `Tables_in_${config.database}`;
    return tables = tablesRaw
        .filter(t => !config.excludedTables.includes(t[tableKey]));
}

module.exports = {
    getTables,
    filterExcludedTables
}