const fs = require('fs');
const ejs = require('ejs');
const chalk = require('chalk');
const util = require('util');
const { map, tap } = require('ramda');

const connection = require('./database/connection');
const columnInfoFactory = require('./database/column-info/factory');
const query = require('./database/query');
const file = require('./file/file');
const utils = require('./utils/utils');
const strUtils = require('./utils/str');
const queryProcess = require('./business/query-process');

const config = require('./config.json');
 
utils.logHeader(config, util, console, chalk);

let fileNames = [];
let allTables = [];

const viewTablesPromise = query.getViewTables(connection)
    .then(queryProcess.sanitizeViewTables(config.database))
    .then(file.getViewTablesTemplate(ejs, config))
    .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(990)}_create_view_tables.php`, config, fs))
    .then(tap(filename => console.log(`${filename} was generated successfully`)))
    .catch(err => console.log(chalk.bgRed(err)));

const proceduresPromise = query.getProcedures(connection, query.getProceduresMeta, query.getProcedureDefinition)
    .then(map(queryProcess.normalizeProcedureDefinition))
    .then(file.getProcedureTemplate(ejs, config))
    .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(991)}_create_procedures.php`, config, fs))
    .then(tap(filename => console.log(`${filename} was generated successfully`)))
    .catch(err => console.log(chalk.bgRed(err)));

const triggersPromise = query.getTriggers(connection, strUtils.concat)
    .then(queryProcess.mapTriggers(config.database))
    .then(file.getTriggersTemplate(ejs, config))
    .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(992)}_create_triggers.php`, config, fs))
    .then(tap(filename => console.log(`${filename}_create_view_tables.php was generated successfully`)))
    .catch(err => console.log(chalk.bgRed(err)));

const tableDataPromise = query.getTableData(connection, config)
    .then(tap(tables => fileNames = file.getFileNames(new Date, tables, file, utils.getSerial)))
    .then(tap(tables => allTables = tables))
    .then(file.getTemplates(ejs, file, config, columnInfoFactory))
    .then(templates => file.generateFiles(templates, fileNames, config, fs, file))
    .catch(err => console.log(chalk.bgRed(err)));

const foreignKeyTemplate = tableDataPromise
    .then(res =>
        file.getForeignKeyTemplate(ejs, config, allTables)
            .then(template => file.generateFile(template, `${utils.getDate()}${utils.getSerial(993)}_add_foreign_keys.php`, config, fs))
            .then(tap(filename => console.log(`${filename} was generated successfully`)))
            .catch(err => console.log(chalk.bgRed(err)))
    )
    .catch(console.log);

Promise.all([tableDataPromise, proceduresPromise, viewTablesPromise, triggersPromise, foreignKeyTemplate])
    .then(_ => connection.end())
    .then(tap(_ => console.log(chalk.green(`All Done.`))))
    .catch(err => console.log(chalk.bgRed(err)));