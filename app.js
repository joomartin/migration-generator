const fs = require('fs');
const ejs = require('ejs');
const _ = require('lodash');
const mysql = require('mysql');
const chalk = require('chalk');
const util = require('util');

const createColumnInfo = require('./database/column-info/factory');
const createTypeMapper = require('./database/type-mapper/factory');
const migration = require('./database/migration');
const query = require('./database/query');
const file = require('./file/file');

const config = require('./config.json');
const typeMapper = createTypeMapper(config.migrationLib);

console.log(chalk.green('****************************'));
console.log(chalk.green('*                          *'));
console.log(chalk.green('*    Migration Generator   *'));
console.log(chalk.green('* GreenTech Innovacio Zrt. *'));
console.log(chalk.green('*                          *'));
console.log(chalk.green('****************************'));
util.log('Getting data from database...');

const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});

connection.connect();

const tableKey = `Tables_in_${config.database}`;

query.getTableData(connection, query, config)
    .then(tables => {
        for (table in tables) {
            if (tables[table].dependencies.length === 0) {
                tables[table].allDependencyOrdered = true;
            }
        }

        let orderedTables = migration.getOrderedMigrations(tables);

        orderedTables.forEach((table, i) => {
            file.getTemplate(table, typeMapper, config, createColumnInfo)
                .then(data => {
                    let fileName = file.generateFile(data.html, data.table, config, fs, (new Date).getTime());
                    util.log(`${fileName} was generated successfully`);
                })
                .catch(err => console.log(err));
        });

        connection.end();
    })
    .catch(err => console.log(err))