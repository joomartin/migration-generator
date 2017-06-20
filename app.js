const fs = require('fs');
const chalk = require('chalk');
const ejs = require('ejs');
const util = require('util');
const { map, tap, compose, composeP, __ } = require('ramda');

const connection = require('./database/connection');
const columnInfoFactory = require('./database/column-info/factory');
const query = require('./database/query');
const file = require('./file/file');
const utils = require('./utils/utils');
const strUtils = require('./utils/str');
const { normalizeProcedureDefinition, sanitizeViewTables, mapTriggers } = require('./business/query-process');
const { generateFile, getViewTablesTemplate, getProcedureTemplate, getTriggersTemplate, getFileNames, getTemplates, generateFiles, getForeignKeyTemplate } = file;
const config = require('./config.json');

utils.logHeader(config, util, console, chalk);

let allTables = [];
let fileNames = [];

const viewTablesPromise = composeP(
    tap(filename => console.log(`${filename} was generated successfully`)),
    generateFile(fs, config, `${utils.getDate()}${utils.getSerial(990)}_create_view_tables.php`),
    getViewTablesTemplate(ejs, config),
    sanitizeViewTables(config.database),
    query.getViewTables,
)(connection);

const proceduresPromise = composeP(
    tap(filename => console.log(`${filename} was generated successfully`)),
    generateFile(fs, config, `${utils.getDate()}${utils.getSerial(991)}_create_procedures.php`),
    getProcedureTemplate(ejs, config),
    map(normalizeProcedureDefinition),
    query.getProcedures
)(connection);

const triggersPromise = composeP(
    tap(filename => console.log(`${filename}_create_view_tables.php was generated successfully`)),
    generateFile(fs, config, `${utils.getDate()}${utils.getSerial(992)}_create_triggers.php`),
    getTriggersTemplate(ejs, config),
    mapTriggers(config.database),
    query.getTriggers
)(connection);

// const tablesPromise = query.getTableData(connection, config)
//     .then(tap(tables => allTables = tables));

// const tablesPromise = composeP(
//     tap(tables => allTables = tables),
//     query.getTableData(connection)
// )(config);

// tablesPromise.then(console.log);

const generateTablesPromise = composeP(
    (files) => files.length,
    (templates) => generateFiles(fs, file, config, fileNames, templates),
    (_) => getTemplates(ejs, file, config, columnInfoFactory, allTables),
    tap(fns => fileNames = fns),
    getFileNames(new Date, file),
    tap(tables => allTables = tables),    
    query.getTableData(connection)
)(config);

// const generateTablesPromise = tablesPromise
//     .then(getFileNames(new Date, file))
//     .then(tap(fns => fileNames = fns))
//     .then(_ => getTemplates(ejs, file, config, columnInfoFactory, allTables))
//     .then(templates => generateFiles(fs, file, config, fileNames, templates))
//     .then(files => files.length)
//     .catch(err => console.log(chalk.bgRed(err)));

const foreignKeyPromise = generateTablesPromise
    .then(_ => getForeignKeyTemplate(ejs, config, allTables))
    .then(generateFile(fs, config, `${utils.getDate()}${utils.getSerial(993)}_add_foreign_keys.php`))
    .then(tap(filename => console.log(`${filename} was generated successfully`)));

Promise.all([proceduresPromise, viewTablesPromise, triggersPromise, foreignKeyPromise, generateTablesPromise])
    .then(([proc, vt, tr, fks, tablesCount]) => console.log(chalk.green(`${tablesCount} tables was generated successfully`)))
    .then(_ => connection.end())
    .then(tap(_ => util.log(chalk.green(`All Done.`))))
    .catch(err => console.log(chalk.bgRed(err)));