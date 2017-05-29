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
console.log('--------');

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

let fileNames = [];

const sideEffect = fn => v => {
    fn(v);
    return v;
}

let tableDataPromise = query.getTableData(connection, query, config)
    .then(tables => file.getTemplates(tables, typeMapper, config, createColumnInfo, ejs, file))
    .then(sideEffect(tables => fileNames = file.getFileNames(new Date, tables, file)))
    .then(sideEffect(tables => console.log(fileNames)))
    // .then(templates => file.generateFiles(templates)) 
    .then(console.log)
    .catch(console.log);

// let viewTablesPromise = query.getViewTables()
//     .then(viewTables => file.getViewTableTemplates())
//     .then(template => file.generateFiles());

// let proceduresPromise = query.getProcedures()
//     .then(procedures => file.getProcedureTemplates())
//     .then(template => file.generateFiles());

// let triggersPromise = query.getTriggers()
//     .then(triggers => file.getTriggerTemplates())
//     .then(template => file.generateFiles());

// Promise.all([tableDataPromise, foreignKeyPromise, proceduresPromise, viewTablesPromise, triggersPromise])
//     .then(res => connection.end())
//     .catch(err => console.log(chalk.bgRed(err)));