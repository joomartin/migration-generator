const fs = require('fs');
const chalk = require('chalk');
const ejs = require('ejs');
const util = require('util');
const { map, tap, compose, composeP, __ } = require('ramda');
const { Either } = require('ramda-fantasy');
const { Left, Right } = Either;

const connection = require('./database/connection');
const columnInfoFactory = require('./database/column-info/factory');
const query = require('./database/query');
const file = require('./file/file');
const utils = require('./utils/utils');
const strUtils = require('./utils/str');
const { normalizeProcedureDefinition, sanitizeViewTables, mapTriggers } = require('./business/query-process');

const config = require('./config.json');

utils.logHeader(config, util, console, chalk);

let fileNames = [];
let allTables = [];

const viewTablesPromise = composeP(
    tap(filename => console.log(`${filename} was generated successfully`)),
    file.generateFile(fs, config, `${utils.getDate()}${utils.getSerial(990)}_create_view_tables.php`),
    file.getViewTablesTemplate(ejs, config),
    sanitizeViewTables(config.database),
    query.getViewTables,
)(connection);

const proceduresPromise = composeP(
    tap(filename => console.log(`${filename} was generated successfully`)),
    file.generateFile(fs, config, `${utils.getDate()}${utils.getSerial(991)}_create_procedures.php`),
    file.getProcedureTemplate(ejs, config),
    map(normalizeProcedureDefinition),
    query.getProcedures
)(connection);

const triggersPromise = composeP(
    tap(filename => console.log(`${filename}_create_view_tables.php was generated successfully`)),
    file.generateFile(fs, config, `${utils.getDate()}${utils.getSerial(992)}_create_triggers.php`),
    file.getTriggersTemplate(ejs, config),
    mapTriggers(config.database),
    query.getTriggers
)(connection);

// const tableDataPromise = composeP(
//     file.generateFiles(fs, file, config, fileNames),
//     tap(_ => console.log(fileNames)),
//     file.getTemplates(ejs, file, config, columnInfoFactory),
//     tap(tables => allTables = tables),
//     tap(tables => fileNames = file.getFileNames(new Date, tables, file, utils.getSerial)),
//     query.getTableData(connection)
// )(config);

const tableDataPromise = query.getTableData(connection, config)
    .then(tap(tables => fileNames = file.getFileNames(new Date, tables, file)))
    .then(tap(tables => allTables = tables))
    .then(file.getTemplates(ejs, file, config, columnInfoFactory))
    .then(file.generateFiles(fs, file, config, fileNames))
    .catch(err => console.log(chalk.bgRed(err)))

const foreignKeyTemplate = tableDataPromise
    .then(_ =>
        file.getForeignKeyTemplate(ejs, config, allTables)
            .then(file.generateFile(fs, config, `${utils.getDate()}${utils.getSerial(993)}_add_foreign_keys.php`))
            .then(tap(filename => console.log(`${filename} was generated successfully`)))
            .catch(err => console.log(chalk.bgRed(err)))
    )
    .catch(console.log);

Promise.all([tableDataPromise, proceduresPromise, viewTablesPromise, triggersPromise, foreignKeyTemplate])
    .then(_ => connection.end())
    .then(tap(_ => util.log(chalk.green(`All Done.`))))
    .catch(err => console.log(chalk.bgRed(err)));