const fs = require('fs');
const ejs = require('ejs');
const _ = require('lodash');
const chalk = require('chalk');
const util = require('util');
const R = require('ramda');

const connection = require('./database/connection');
const columnInfoFactory = require('./database/column-info/factory');
const query = require('./database/query');
const file = require('./file/file');
const utils = require('./utils/utils');
const strUtils = require('./utils/str');
const queryProcess = require('./business/query-process');

const config = require('./config.json');
const queryProcessFactory = require('./business/query-process-factory');
 
utils.logHeader(config, util, console, chalk);

let fileNames = [];
let allTables = [];

const sanitizeFn = queryProcess.sanitizeViewTables(config.database, queryProcess.replaceDatabaseInContent, utils.escapeQuotes);

const normalizeProcedureDefinitionFn = queryProcessFactory.normalizeProcedureDefinitionFactory(
    _, utils.escapeQuotes);

const mapTriggersFn = queryProcessFactory.mapTriggersFactory(_, utils.escapeQuotes, config.database);

let viewTablesPromise = query.getViewTables(connection, strUtils.concat)
    .then(sanitizeFn)
    .then(file.getViewTablesTemplate(ejs, config))
    .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(990)}_create_view_tables.php`, config, fs))
    .then(utils.sideEffect(filename => console.log(`${filename} was generated successfully`)))
    .catch(err => console.log(chalk.bgRed(err)));

let proceduresPromise = query.getProcedures(connection, query.getProceduresMeta, query.getProcedureDefinition, strUtils.concat)
    .then(R.map(normalizeProcedureDefinitionFn))
    .then(file.getProcedureTemplate(ejs, config))
    .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(991)}_create_procedures.php`, config, fs))
    .then(utils.sideEffect(filename => console.log(`${filename} was generated successfully`)))
    .catch(err => console.log(chalk.bgRed(err)));

let triggersPromise = query.getTriggers(connection, strUtils.concat)
    .then(mapTriggersFn)
    .then(file.getTriggersTemplate(ejs, config))
    .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(992)}_create_triggers.php`, config, fs))
    .then(utils.sideEffect(filename => console.log(`${filename}_create_view_tables.php was generated successfully`)))
    .catch(err => console.log(chalk.bgRed(err)));

let tableDataPromise = query.getTableData(connection, query, config, queryProcess, utils)
    .then(utils.sideEffect(tables => fileNames = file.getFileNames(new Date, tables, file, utils.getSerial)))
    .then(utils.sideEffect(tables => allTables = tables))
    .then(tables => file.getTemplates(tables, config, columnInfoFactory, ejs, file))
    .then(templates => file.generateFiles(templates, fileNames, config, fs, file))
    .catch(err => console.log(chalk.bgRed(err)));

let foreignKeyTemplate = tableDataPromise
    .then(res =>
        file.getForeignKeyTemplate(allTables, config, ejs)
            .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(993)}_add_foreign_keys.php`, config, fs))
            .then(utils.sideEffect(filename => console.log(`${filename} was generated successfully`)))
            .catch(err => console.log(chalk.bgRed(err)))
    )
    .catch(console.log);

Promise.all([tableDataPromise, proceduresPromise, viewTablesPromise, triggersPromise, foreignKeyTemplate])
    .then(_ => connection.end())
    .then(utils.sideEffect(_ => console.log(chalk.green(`All Done.`))))
    .catch(err => console.log(chalk.bgRed(err)));