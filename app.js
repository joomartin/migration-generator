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

console.log(chalk.green('********************************************************'));
console.log(chalk.green('*                                                      *'));
console.log(chalk.green('*                 Migration Generator                  *'));
console.log(chalk.green('*               GreenTech Innovacio Zrt.               *'));
console.log(chalk.green('*                                                      *'));
console.log(chalk.green('********************************************************'));

util.log(chalk.yellow(`Generating initial migrations for database ${chalk.bold(config.database)}...`));
util.log(chalk.yellow(`View tables, procedures, triggers, static contents, dependencies will be created`));
util.log(chalk.bgRed.bold.yellow(`***Don't forget to rewrite DEFINER in views, procedures, triggers***`));
console.log('--------');

const getDate = () => {
    let date = new Date;
    return `${date.getFullYear()}${("0" + date.getMonth()).slice(-2)}${date.getDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}${date.getMilliseconds()}`;      
}

const connection = mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database
});

connection.connect();

const tableKey = `Tables_in_${config.database}`;
let i = 0;

let tablesPromise = query.getTableData(connection, query, config)
    .then(tables => {
        let length = Object.keys(tables).length;
        for (table in tables) {
            (function (index) {
                file.getTemplate(tables[table], typeMapper, config, createColumnInfo, ejs)
                    .then(data => {
                        let fileName = `${getDate()}${index}_create_${data.table}_table.php`;
                        file.generateFile(data.html, fileName, config, fs)
                            .then(fileName => {
                                util.log(`${data.table} was generated successfully`);
                            })
                            .catch(err => console.log(chalk.bgRed(err)));

                    })
                    .catch(err => console.log(chalk.bgRed(err)));
            }(i));
            i++;
        }

        let foreignKeyPromise = file.getForeignKeyTemplate(tables, config, ejs)
            .then(html => {
                let fileName = `${getDate()}${length}_add_foreign_keys.php`;
                file.generateFile(html, fileName, config, fs)
                    .then(fileName => {
                        util.log(`Foreign keys was generated successfully`);
                    })
                    .catch(err => console.log(chalk.bgRed(err)));
            });

        let viewTablesPromise = query.getViewTables(connection, query.escapeQuotes)
            .then(viewTables => {
                file.getViewTablesTemplate(viewTables, config, ejs)
                    .then(html => {
                        let fileName = `${getDate()}${length + 1}_create_view_tables.php`;
                        file.generateFile(html, fileName, config, fs)
                            .then(fileName => {
                                util.log(`View tables was generated successfully`);
                            })
                            .catch(err => console.log(chalk.bgRed(err)));
                    });
            })
            .catch(err => console.log(chalk.bgRed(err)));

        let proceduresPromise = query.getProcedures(connection, query.convertProceduresToObjects, query.escapeQuotes)
            .then(procedures => {
                file.getProcedureTemplate(procedures, config, ejs)
                    .then(html => {
                        let fileName = `${getDate()}${length + 2}_add_procedures_and_functions.php`;
                        file.generateFile(html, fileName, config, fs)
                            .then(fileName => {
                                util.log(`Procedures and functions was generated successfully`);
                            })
                            .catch(err => console.log(chalk.bgRed(err)));
                    });
            })
            .catch(err => console.log(chalk.bgRed(err)));

        let triggersPromise = query.getTriggers(connection, query.escapeQuotes, _)
            .then(triggers => {
                file.getTriggersTemplate(triggers, config, ejs)
                    .then(html => {
                        let fileName = `${getDate()}${length + 3}_add_triggers.php`;
                        file.generateFile(html, fileName, config, fs)
                            .then(fileName => {
                                util.log(`Triggers was generated successfully`);
                            })
                            .catch(err => console.log(err));
                    });
            })
            .catch(err => console.log(chalk.bgRed(err)));

        Promise.all([foreignKeyPromise, proceduresPromise, viewTablesPromise, triggersPromise])
            .then(res => {
                connection.end();
            })
            .catch(err => console.log(chalk.bgRed(err)));
    })
    .catch(err => console.log(chalk.bgRed(err)));