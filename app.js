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
        for (table in tables) {
            file.getTemplate(tables[table], typeMapper, config, createColumnInfo, ejs)
                .then(data => {
                    let fileName = `${(new Date).getTime()}_create_${data.table}_table.php`;
                    file.generateFile(data.html, fileName, config, fs)
                        .then(fileName => {
                            util.log(`${fileName} was generated successfully`);
                        })
                        .catch(err => console.log(err));
                })
                .catch(err => console.log(err));
        }

        file.getForeignKeyTemplate(tables, config, ejs)
            .then(html => {
                let fileName = `z_${(new Date).getTime()}_add_foreign_keys.php`;
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