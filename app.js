const fs = require('fs');
const ejs = require('ejs');
const _ = require('lodash');
const chalk = require('chalk');
const util = require('util');

const connection = require('./database/connection');
const createColumnInfo = require('./database/column-info/factory');
const createTypeMapper = require('./database/type-mapper/factory');
const query = require('./database/query');
const file = require('./file/file');
const utils = require('./utils/utils');

const config = require('./config.json');
const typeMapper = createTypeMapper(config.migrationLib);

utils.logHeader(config);

let fileNames = [];
let allTables = [];

let viewTablesPromise = query.getViewTables(connection, query.escapeQuotes)
    .then(viewTables => file.getViewTablesTemplate(viewTables, config, ejs))
    .then(template => file.generateFile(template, `${utils.getDate((new Date).getMinutes() + 1)}_create_view_tables.php`, config, fs))
    .then(utils.sideEffect(filename => console.log(`${filename} was generated successfully`)))
    .catch(err => console.log(chalk.bgRed(err)));

let proceduresPromise = query.getProcedures(connection, query.convertProceduresToObjects, query.escapeQuotes)
    .then(procedures => file.getProcedureTemplate(procedures, config, ejs))
    .then(template => file.generateFile(template, `${utils.getDate((new Date).getMinutes() + 1)}_create_procedures.php`, config, fs))
    .then(utils.sideEffect(filename => console.log(`${filename} was generated successfully`)))
    .catch(err => console.log(chalk.bgRed(err)));

let triggersPromise = query.getTriggers(connection, query.escapeQuotes, _)
    .then(triggers => file.getTriggersTemplate(triggers, config, ejs))
    .then(template => file.generateFile(template, `${utils.getDate((new Date).getMinutes() + 1)}_create_triggers.php`, config, fs))
    .then(utils.sideEffect(filename => console.log(`${filename}_create_view_tables.php was generated successfully`)))
    .catch(err => console.log(chalk.bgRed(err)));

let tableDataPromise = query.getTableData(connection, query, config)
    .then(utils.sideEffect(tables => fileNames = file.getFileNames(new Date, tables, file)))
    .then(utils.sideEffect(tables => allTables = tables))
    .then(tables => file.getTemplates(tables, typeMapper, config, createColumnInfo, ejs, file))
    .then(templates => file.generateFiles(templates, fileNames, config, fs, file))
    .catch(err => console.log(chalk.bgRed(err)));

let foreignKeyTemplate = tableDataPromise
    .then(res =>
        file.getForeignKeyTemplate(allTables, config, ejs)
            .then(template => file.generateFile(template, `${utils.getDate((new Date).getMinutes() + 2)}_add_foreign_keys.php`, config, fs))
            .then(utils.sideEffect(filename => console.log(`${filename} was generated successfully`)))
            .catch(err => console.log(chalk.bgRed(err)))
    )
    .catch(console.log);

Promise.all([tableDataPromise, proceduresPromise, viewTablesPromise, triggersPromise, foreignKeyTemplate])
    .then(res => {
        connection.end()
        util.log(chalk.green(`All Done.`));
    })
    .catch(err => console.log(chalk.bgRed(err)));