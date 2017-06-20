const fs = require('fs');
const chalk = require('chalk');
const ejs = require('ejs');
const util = require('util');
const { map, tap, compose, composeP, __, length } = require('ramda');

const config = require('./config.json');
const connection = require('./database/connection');
const columnInfoFactory = require('./database/column-info/factory');

const file = require('./file/file');
const { getDate , getSerial, logHeader } = require('./utils/utils');
const { getViewTables, getProcedures, getTriggers, getTableData } = require('./database/query');
const { normalizeProcedureDefinition, sanitizeViewTables, mapTriggers } = require('./business/query-process');
const { generateFile, getViewTablesTemplate, getProcedureTemplate, getTriggersTemplate, getFileNames, getTemplates, generateFiles, getForeignKeyTemplate } = file;


logHeader(config, util, console, chalk);

let allTables = [];
let fileNames = [];

const viewTablesPromise = composeP(
    tap(filename => console.log(`${filename} was generated successfully`)),
    generateFile(fs, config, `${getDate()}${getSerial(990)}_create_view_tables.php`),
    getViewTablesTemplate(ejs, config),
    sanitizeViewTables(config.database),
    getViewTables,
)(connection);

const proceduresPromise = composeP(
    tap(filename => console.log(`${filename} was generated successfully`)),
    generateFile(fs, config, `${getDate()}${getSerial(991)}_create_procedures.php`),
    getProcedureTemplate(ejs, config),
    map(normalizeProcedureDefinition),
    getProcedures
)(connection);

const triggersPromise = composeP(
    tap(filename => console.log(`${filename}_create_view_tables.php was generated successfully`)),
    generateFile(fs, config, `${getDate()}${getSerial(992)}_create_triggers.php`),
    getTriggersTemplate(ejs, config),
    mapTriggers(config.database),
    getTriggers
)(connection);

const generateTablesPromise = composeP(
    tap(filename => console.log(`${filename} was generated successfully`)),    
    generateFile(fs, config, `${getDate()}${getSerial(993)}_add_foreign_keys.php`),    
    (_) => getForeignKeyTemplate(ejs, config, allTables),    
    (templates) => generateFiles(fs, file, config, fileNames, templates),
    (_) => getTemplates(ejs, file, config, columnInfoFactory, allTables),
    tap(fns => fileNames = fns),
    getFileNames,
    tap(tables => allTables = tables),    
    getTableData(connection)
)(config);

Promise.all([proceduresPromise, viewTablesPromise, triggersPromise, generateTablesPromise])
    .then(_ => console.log(chalk.green(`${allTables.length} tables was generated successfully`)))
    .then(_ => connection.end())
    .then(tap(_ => util.log(chalk.green(`All Done.`))))
    .catch(err => console.log(chalk.bgRed(err)));