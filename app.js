const fs = require('fs');
const ejs = require('ejs');
const _ = require('lodash');
const mysql = require('mysql');
const chalk = require('chalk');
const util = require('util');

const createColumnInfo = require('./database/column-info/factory');
const createTypeMapper = require('./database/type-mapper/factory');
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
util.log(`Getting data from database "${config.database}"...`);

const connection = mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database
});

connection.connect();

const tableKey = `Tables_in_${config.database}`;

query.getTableData(connection, query, config)
    .then(tables => {
        let i = 0;
        for (table in tables) {
            (function (index) {
                file.getTemplate(tables[table], typeMapper, config, createColumnInfo, ejs)
                    .then(data => {
                        let fileName = `${(new Date).getTime()}${index}_create_${data.table}_table.php`;
                        file.generateFile(data.html, fileName, config, fs)
                            .then(fileName => {
                                util.log(`${fileName} was generated successfully`);
                            })
                            .catch(err => console.log(err));

                    })
                    .catch(err => console.log(err));
            }(i));
            i++;
        }

        file.getForeignKeyTemplate(tables, config, ejs)
            .then(html => {
                let fileName = `${(new Date).getTime()}${i}_add_foreign_keys.php`;
                file.generateFile(html, fileName, config, fs)
                    .then(fileName => {
                        util.log(`${fileName} was generated successfully`);
                    })
                    .catch(err => console.log(err));
            })
            .catch(err => console.log(err));

        connection.end();
    })
    .catch(err => console.log(err));

let viewTablesPromise = query.getViewTables(connection)
    .then(viewTables => {
        file.getProcedureTemplate(viewTables, config, ejs)
            .then(html => {
                let fileName = `${(new Date).getTime()}x_add_procedures.php`;
                file.generateFile(html, fileName, config, fs)
                    .then(fileName => {
                        util.log(`${fileName} was generated successfully`);
                    })
                    .catch(err => console.log(err));
            });
    })
    .catch(err => console.log(err));

Promise.all([tablesPromise, viewTablesPromise])
    .then(res => {
        connection.end();
    });