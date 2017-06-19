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

// (async () => {
    // const viewTables = await query.getViewTables(connection);
    // const sanitized = sanitizeViewTables(config.database, viewTables);
    // const templates = await file.getViewTablesTemplate(ejs, config, viewTables);
    // const filename = await file.generateFile(fs, config, `${utils.getDate()}${utils.getSerial(990)}_create_view_tables.php`, templates);
    // console.log(`${filename} was generated successfully`);
// })();

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

// const viewTablesPromise = query.getViewTables(connection)
//     .then(sanitizeViewTables(config.database))
//     .then(file.getViewTablesTemplate(ejs, config))
//     .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(990)}_create_view_tables.php`, config, fs))
//     .then(tap(filename => console.log(`${filename} was generated successfully`)))
//     .catch(err => console.log(chalk.bgRed(err)));

// const proceduresPromise = query.getProcedures(connection, query.getProceduresMeta, query.getProcedureDefinition)
//     .then(map(normalizeProcedureDefinition))
//     .then(file.getProcedureTemplate(ejs, config))
//     .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(991)}_create_procedures.php`, config, fs))
//     .then(tap(filename => console.log(`${filename} was generated successfully`)))
//     .catch(err => console.log(chalk.bgRed(err)));

// const triggersPromise = query.getTriggers(connection, strUtils.concat)
//     .then(mapTriggers(config.database))
//     .then(file.getTriggersTemplate(ejs, config))
//     .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(992)}_create_triggers.php`, config, fs))
//     .then(tap(filename => console.log(`${filename}_create_view_tables.php was generated successfully`)))
//     .catch(err => console.log(chalk.bgRed(err)));

// const tableDataPromise = query.getTableData(connection, config)
//     .then(tap(tables => fileNames = file.getFileNames(new Date, tables, file, utils.getSerial)))
//     .then(tap(tables => allTables = tables))
//     .then(file.getTemplates(ejs, file, config, columnInfoFactory))
//     .then(templates => file.generateFiles(templates, fileNames, config, fs, file))
//     .catch(err => console.log(chalk.bgRed(err)));

// const foreignKeyTemplate = tableDataPromise
//     .then(res =>
//         file.getForeignKeyTemplate(ejs, config, allTables)
//             .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(993)}_add_foreign_keys.php`, config, fs))
//             .then(tap(filename => console.log(`${filename} was generated successfully`)))
//             .catch(err => console.log(chalk.bgRed(err)))
//     )
//     .catch(console.log);

// Promise.all([tableDataPromise, proceduresPromise, viewTablesPromise, triggersPromise, foreignKeyTemplate])
//     .then(_ => connection.end())
//     .then(tap(_ => console.log(chalk.green(`All Done.`))))
//     .catch(err => console.log(chalk.bgRed(err)));