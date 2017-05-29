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
let allTables = [];

const sideEffect = fn => v => {
    fn(v);
    return v;
}

const identity = v => v;
const merge = (promise, outTrans = identity, inTrans = identity) => d =>
    promise(inTrans(d))
        .then(outTrans)
        .then(result => Object.assign({}, d, result));

let viewTablesPromise = query.getViewTables(connection, query.escapeQuotes)
    .then(viewTables => file.getViewTablesTemplate(viewTables, config, ejs))
    .then(template => file.generateFile(template, `${new Date().getTime()}1_create_view_tables.php`, config, fs))
    .then(file => console.log(`${new Date().getTime()}1_create_view_tables.php was generated successfully`))
    .catch(console.log);

let proceduresPromise = query.getProcedures(connection, query.convertProceduresToObjects, query.escapeQuotes)
    .then(procedures => file.getProcedureTemplate(procedures, config, ejs))
    .then(template => file.generateFile(template, `${new Date().getTime()}1_create_procedures.php`, config, fs))
    .then(file => console.log(`${new Date().getTime()}1_create_procedures.php was generated successfully`))
    .catch(console.log);

let triggersPromise = query.getTriggers(connection, query.escapeQuotes, _)
    .then(triggers => file.getTriggersTemplate(triggers, config, ejs))
    .then(template => file.generateFile(template, `${new Date().getTime()}1_create_triggers.php`, config, fs))
    .then(file => console.log(`${new Date().getTime()}1_create_create_triggers.php was generated successfully`))    
    .catch(console.log);

let tableDataPromise = query.getTableData(connection, query, config)
    .then(sideEffect(tables => fileNames = file.getFileNames(new Date, tables, file)))
    .then(sideEffect(tables => allTables = tables))
    .then(tables => file.getTemplates(tables, typeMapper, config, createColumnInfo, ejs, file))
    .then(templates => file.generateFiles(templates, fileNames, config, fs, file))
    .catch(console.log);

let foreignKeyTemplate = tableDataPromise
    .then(res =>
        file.getForeignKeyTemplate(allTables, config, ejs)
            .then(template => file.generateFile(template, `${(new Date).getTime()}_add_foreign_keys.php`, config, fs))
            .then(fileName => console.log(`Foreign keys was generated successfully`))
            .catch(console.log)
    )
    .catch(console.log);

Promise.all([tableDataPromise, proceduresPromise, viewTablesPromise, triggersPromise, foreignKeyTemplate])
    .then(res => {
        connection.end()
        util.log('All Done');
    })
    .catch(err => console.log(chalk.bgRed(err)));